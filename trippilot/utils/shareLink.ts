import type { TravelMode } from "../App";
import type { Place } from "../data";

export type ShareTripPayloadV1 = {
  v: 1;
  departureTime: string;
  travelMode: TravelMode;
  // Keep payload small; images/tips can be re-derived.
  trip: Array<{
    id: string;
    name: string;
    loc: string;
    lat?: number;
    lng?: number;
    rating?: number;
    tag?: string;
    type?: string;
    placeTypes?: string[];
    openingHours?: {
      openNow?: boolean;
      weekdayText?: string[];
    };
    priceLevel?: number;
  }>;
};

// Smaller payload for shorter share URLs.
// trip item tuple: [id, name, loc] or [id, name, loc, lat, lng]
export type ShareTripPayloadV2 = {
  v: 2;
  departureTime: string;
  travelMode: TravelMode;
  trip: Array<
    [string, string, string] | [string, string, string, number, number]
  >;
};

export type ShareTripPayload = ShareTripPayloadV1 | ShareTripPayloadV2;

const base64UrlEncodeUtf8 = (text: string): string => {
  const utf8 = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16)),
  );
  const b64 = btoa(utf8);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const base64UrlDecodeUtf8 = (b64url: string): string => {
  const b64 = b64url
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(b64url.length / 4) * 4, "=");
  const binary = atob(b64);
  const percentEncoded = Array.from(binary)
    .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
  return decodeURIComponent(percentEncoded);
};

export const encodeSharePayload = (payload: ShareTripPayload): string => {
  return base64UrlEncodeUtf8(JSON.stringify(payload));
};

export const decodeSharePayload = (
  encoded: string,
): ShareTripPayload | null => {
  try {
    const json = base64UrlDecodeUtf8(String(encoded || "").trim());
    const raw = JSON.parse(json);
    if (!raw || typeof raw !== "object") return null;
    if (typeof raw.departureTime !== "string") return null;
    if (
      raw.travelMode !== "TRANSIT" &&
      raw.travelMode !== "DRIVING" &&
      raw.travelMode !== "WALKING"
    ) {
      return null;
    }
    if (!Array.isArray(raw.trip) || raw.trip.length < 1) return null;

    // v2 (compact)
    if (raw.v === 2) {
      const trip = raw.trip
        .map((t: any) => {
          if (!Array.isArray(t) || t.length < 3) return null;
          const id = String(t[0] || "").trim();
          const name = String(t[1] || "").trim();
          const loc = String(t[2] || "").trim();
          const lat = typeof t[3] === "number" ? t[3] : undefined;
          const lng = typeof t[4] === "number" ? t[4] : undefined;

          const tuple: any = [id, name, loc];
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            tuple.push(lat, lng);
          }
          return tuple as ShareTripPayloadV2["trip"][number];
        })
        .filter(Boolean) as ShareTripPayloadV2["trip"];

      if (trip.length < 1) return null;
      return {
        v: 2,
        departureTime: String(raw.departureTime),
        travelMode: raw.travelMode,
        trip,
      };
    }

    // v1 (legacy)
    if (raw.v !== 1) return null;

    const trip = raw.trip
      .map((p: any) => ({
        id: String(p?.id || "").trim(),
        name: String(p?.name || "").trim(),
        loc: String(p?.loc || "").trim(),
        lat: typeof p?.lat === "number" ? p.lat : undefined,
        lng: typeof p?.lng === "number" ? p.lng : undefined,
        rating: typeof p?.rating === "number" ? p.rating : undefined,
        tag: typeof p?.tag === "string" ? p.tag : undefined,
        type: typeof p?.type === "string" ? p.type : undefined,
        placeTypes: Array.isArray(p?.placeTypes)
          ? p.placeTypes.map((x: any) => String(x))
          : undefined,
        openingHours:
          p?.openingHours && typeof p.openingHours === "object"
            ? {
                openNow:
                  typeof p.openingHours.openNow === "boolean"
                    ? p.openingHours.openNow
                    : undefined,
                weekdayText: Array.isArray(p.openingHours.weekdayText)
                  ? p.openingHours.weekdayText.map((x: any) => String(x))
                  : undefined,
              }
            : undefined,
        priceLevel:
          typeof p?.priceLevel === "number" ? p.priceLevel : undefined,
      }))
      .filter((p: any) => p.id && p.name);

    if (trip.length < 1) return null;

    return {
      v: 1,
      departureTime: String(raw.departureTime),
      travelMode: raw.travelMode,
      trip,
    };
  } catch {
    return null;
  }
};

export const buildShareUrl = (payload: ShareTripPayload): string => {
  const url = new URL(window.location.href);
  url.searchParams.set("share", encodeSharePayload(payload));
  // Keep URL clean and deterministic.
  url.hash = "";
  return url.toString();
};

export const buildSharePayloadFromState = (args: {
  myTrip: Place[];
  departureTime: string;
  travelMode: TravelMode;
}): ShareTripPayloadV2 => {
  return {
    v: 2,
    departureTime: args.departureTime,
    travelMode: args.travelMode,
    trip: args.myTrip
      .map((p) => {
        const id = String(p.id || "").trim();
        const name = String(p.name || "").trim();
        const loc = String(p.loc || "").trim();
        if (!id || !name) return null;

        const lat =
          typeof p.lat === "number" && Number.isFinite(p.lat)
            ? p.lat
            : undefined;
        const lng =
          typeof p.lng === "number" && Number.isFinite(p.lng)
            ? p.lng
            : undefined;

        if (lat != null && lng != null) {
          return [id, name, loc, lat, lng] as const;
        }
        return [id, name, loc] as const;
      })
      .filter(Boolean) as ShareTripPayloadV2["trip"],
  };
};

export const buildGoogleMapsNavigationUrl = (
  places: { lat?: number; lng?: number }[],
  travelMode: TravelMode,
): string | null => {
  if (places.length < 2) return null;
  // Filter out places with missing lat/lng
  const validPlaces = places.filter(
    (p) => typeof p.lat === "number" && typeof p.lng === "number",
  );
  if (validPlaces.length < 2) return null;

  const origin = validPlaces[0];
  const destination = validPlaces[validPlaces.length - 1];
  const waypoints = validPlaces.slice(1, -1);

  const url = new URL("https://www.google.com/maps/dir/?api=1");
  url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destination", `${destination.lat},${destination.lng}`);

  if (waypoints.length > 0) {
    const wpStr = waypoints.map((p) => `${p.lat},${p.lng}`).join("|");
    url.searchParams.set("waypoints", wpStr);
  }

  // Google Maps Direction API 'travelmode' (camelCase).
  // Note: 'transit' with waypoints is often not supported, but we pass it anyway.
  const modeMap: Record<string, string> = {
    DRIVING: "driving",
    WALKING: "walking",
    TRANSIT: "transit",
  };
  if (modeMap[travelMode]) {
    url.searchParams.set("travelmode", modeMap[travelMode]);
  }

  return url.toString();
};
