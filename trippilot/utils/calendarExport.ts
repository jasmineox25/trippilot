import type { Place } from "../data";
import { getRecommendedStay } from "./recommendedStay";

const pad2 = (n: number) => String(n).padStart(2, "0");

const formatIcsLocalDateTime = (d: Date) => {
  return (
    String(d.getFullYear()) +
    pad2(d.getMonth() + 1) +
    pad2(d.getDate()) +
    "T" +
    pad2(d.getHours()) +
    pad2(d.getMinutes()) +
    pad2(d.getSeconds())
  );
};

const escapeIcsText = (input: string) => {
  return String(input || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
};

const foldIcsLine = (line: string): string[] => {
  // RFC 5545 recommends 75 octets. We do a simple char-based fold that works
  // well enough for typical ASCII content.
  const max = 70;
  const out: string[] = [];
  let rest = line;
  while (rest.length > max) {
    out.push(rest.slice(0, max));
    rest = " " + rest.slice(max);
  }
  out.push(rest);
  return out;
};

const toGoogleMapsLink = (place: Place) => {
  const query = encodeURIComponent(`${place.name} ${place.loc || ""}`.trim());
  const url = new URL("https://www.google.com/maps/search/?api=1");
  url.searchParams.set("query", query);
  // If this is a Google Place ID, Google will use it for better precision.
  if (place.id && /^ChI/.test(place.id)) {
    url.searchParams.set("query_place_id", place.id);
  }
  return url.toString();
};

const getLegDurationSec = (legRes: any): number => {
  const idx = Number(legRes?.preferredRouteIndex || 0);
  const leg = legRes?.routes?.[idx]?.legs?.[0];
  const sec = Number(leg?.duration?.value || 0);
  return Number.isFinite(sec) ? Math.max(0, sec) : 0;
};

export function buildRouteIcs(input: {
  places: Place[];
  legs: any[];
  departureTime?: string;
  title?: string;
}): { ics: string; filename: string } {
  const places = (input.places || []).filter(Boolean);
  const legs = input.legs || [];

  const dep = (() => {
    const raw = String(input.departureTime || "");
    const d = raw ? new Date(raw) : new Date();
    return Number.isFinite(d.getTime()) ? d : new Date();
  })();

  const tripTitle = String(input.title || "Trip route").trim() || "Trip route";

  const now = new Date();
  const dtstamp = formatIcsLocalDateTime(now);

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//TripPilot//TripPilot Calendar Export//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");

  let cursor = new Date(dep);

  // If we cannot compute legs, still export visits (with recommended durations).
  const safeLegCount = Math.max(
    0,
    Math.min(legs.length, Math.max(0, places.length - 1)),
  );

  for (let i = 0; i < places.length; i++) {
    if (i === 0) continue;

    const from = places[i - 1];
    const to = places[i];

    // Travel event
    const travelSec = i - 1 < safeLegCount ? getLegDurationSec(legs[i - 1]) : 0;
    if (travelSec > 0) {
      const start = new Date(cursor);
      const end = new Date(cursor.getTime() + travelSec * 1000);
      cursor = new Date(end);

      const summary = `Travel: ${from.name} → ${to.name}`;
      const desc = `Route leg (${travelSec} sec)\nFrom: ${from.name} (${from.loc || ""})\nTo: ${to.name} (${to.loc || ""})`;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${dtstamp}-${i}-travel@trippilot`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART:${formatIcsLocalDateTime(start)}`);
      lines.push(`DTEND:${formatIcsLocalDateTime(end)}`);
      lines.push(`SUMMARY:${escapeIcsText(summary)}`);
      lines.push(`DESCRIPTION:${escapeIcsText(desc)}`);
      lines.push("END:VEVENT");
    }

    // Visit event
    const stayMin = (() => {
      try {
        const rec = getRecommendedStay(to);
        const m = Number(rec?.minutes || 0);
        if (Number.isFinite(m) && m > 0) return Math.round(m);
      } catch {
        // ignore
      }
      return 60;
    })();

    const visitStart = new Date(cursor);
    const visitEnd = new Date(cursor.getTime() + stayMin * 60 * 1000);
    cursor = new Date(visitEnd);

    const summary = `Visit: ${to.name}`;
    const descParts = [
      `Trip: ${tripTitle}`,
      `Stop ${i}/${places.length - 1}`,
      to.loc ? `Location: ${to.loc}` : "",
      `Recommended stay: ${stayMin} min`,
      `Maps: ${toGoogleMapsLink(to)}`,
    ].filter(Boolean);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${dtstamp}-${i}-visit@trippilot`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${formatIcsLocalDateTime(visitStart)}`);
    lines.push(`DTEND:${formatIcsLocalDateTime(visitEnd)}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    if (to.loc) lines.push(`LOCATION:${escapeIcsText(to.loc)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(descParts.join("\n"))}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const folded = lines.flatMap((l) => foldIcsLine(l));
  const ics = folded.join("\r\n") + "\r\n";

  const yyyy = dep.getFullYear();
  const mm = pad2(dep.getMonth() + 1);
  const dd = pad2(dep.getDate());
  const filename = `trippilot-route-${yyyy}-${mm}-${dd}.ics`;

  return { ics, filename };
}

export function downloadIcsFile(input: {
  ics: string;
  filename: string;
}): void {
  const blob = new Blob([input.ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = input.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function buildGoogleCalendarEventUrl(input: {
  title: string;
  details?: string;
  location?: string;
  start: Date;
  end: Date;
}): string {
  const fmt = (d: Date) =>
    String(d.getFullYear()) +
    pad2(d.getMonth() + 1) +
    pad2(d.getDate()) +
    "T" +
    pad2(d.getHours()) +
    pad2(d.getMinutes()) +
    pad2(d.getSeconds());

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", input.title);
  url.searchParams.set("dates", `${fmt(input.start)}/${fmt(input.end)}`);
  if (input.details) url.searchParams.set("details", input.details);
  if (input.location) url.searchParams.set("location", input.location);
  return url.toString();
}
