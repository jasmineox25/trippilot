export type BusinessHoursWindow =
  | {
      status: "ok";
      openMinutes: number;
      closeMinutes: number;
      rawLine?: string;
    }
  | { status: "closed"; rawLine?: string }
  | { status: "unknown"; rawLine?: string };

const dayNamesEn = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const dayNamesZh = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const dayNamesJa = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
];

const normalizeWhitespace = (s: string) => s.replace(/\s+/g, " ").trim();

const pickWeekdayLine = (
  weekdayText: string[] | undefined,
  date: Date,
): string | undefined => {
  if (!weekdayText || weekdayText.length === 0) return undefined;

  const dow = date.getDay(); // 0=Sun
  const en = dayNamesEn[dow];
  const zh = dayNamesZh[dow];
  const ja = dayNamesJa[dow];

  const found = weekdayText.find((line) => {
    const lower = String(line).toLowerCase();
    const raw = String(line);
    return lower.startsWith(en) || raw.includes(zh) || raw.includes(ja);
  });
  if (found) return found;

  // Fallback: assume Google format is Monday-first.
  if (weekdayText.length === 7) {
    const mondayFirstIndex = (dow + 6) % 7;
    return weekdayText[mondayFirstIndex];
  }

  return undefined;
};

const parseTimeToMinutes = (raw: string): number | undefined => {
  const s = normalizeWhitespace(raw)
    .replace(/[（）()]/g, "")
    .replace(/\./g, ":")
    .toLowerCase();

  if (!s) return undefined;

  // Handle Chinese/Japanese meridiem hints.
  const hasAM = s.includes("am") || s.includes("上午");
  const hasPM = s.includes("pm") || s.includes("下午") || s.includes("夜");

  // Extract hour/minute.
  const m = s.match(/(\d{1,2})(?::(\d{2}))?/);
  if (!m) return undefined;

  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined;

  // AM/PM conversion.
  const ampm = s.match(/\b(am|pm)\b/);
  if (ampm) {
    const tag = ampm[1];
    if (tag === "am") {
      if (hour === 12) hour = 0;
    } else {
      if (hour !== 12) hour += 12;
    }
  } else if (hasAM || hasPM) {
    if (hasAM) {
      if (hour === 12) hour = 0;
    } else if (hasPM) {
      if (hour !== 12) hour += 12;
    }
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return hour * 60 + minute;
};

const parseRanges = (
  timePart: string,
): Array<{ start: number; end: number }> => {
  const normalized = normalizeWhitespace(timePart)
    .replace(/–|—/g, "-")
    .replace(/〜|～/g, "-")
    .replace(/ to /g, "-")
    .replace(/\s*-\s*/g, "-");

  // Multiple ranges may be separated by commas.
  const segments = normalized
    .split(/,|；|;/)
    .map((x) => normalizeWhitespace(x))
    .filter(Boolean);

  const ranges: Array<{ start: number; end: number }> = [];

  for (const seg of segments) {
    const parts = seg.split("-").map((x) => normalizeWhitespace(x));
    if (parts.length < 2) continue;

    const start = parseTimeToMinutes(parts[0]);
    const end = parseTimeToMinutes(parts[1]);
    if (start == null || end == null) continue;

    // If it closes after midnight, allow end to be next day.
    const adjustedEnd = end <= start ? end + 1440 : end;
    ranges.push({ start, end: adjustedEnd });
  }

  return ranges;
};

export const getBusinessHoursForDate = (
  openingHours: { weekdayText?: string[] } | undefined,
  date: Date,
): BusinessHoursWindow => {
  const line = pickWeekdayLine(openingHours?.weekdayText, date);
  if (!line) return { status: "unknown" };

  const rawLine = String(line);
  const lower = rawLine.toLowerCase();

  if (
    lower.includes("closed") ||
    rawLine.includes("休息") ||
    rawLine.includes("休業") ||
    rawLine.includes("停业") ||
    rawLine.includes("歇业")
  ) {
    return { status: "closed", rawLine };
  }

  if (
    lower.includes("open 24") ||
    lower.includes("24 hours") ||
    rawLine.includes("24 小时") ||
    rawLine.includes("24小时")
  ) {
    return { status: "ok", openMinutes: 0, closeMinutes: 1440, rawLine };
  }

  // Split "Monday: 9:00 AM – 5:00 PM" or "周一: 10:00–21:00".
  const idx = rawLine.indexOf(":");
  const timePart = idx >= 0 ? rawLine.slice(idx + 1) : rawLine;

  const ranges = parseRanges(timePart);
  if (ranges.length === 0) return { status: "unknown", rawLine };

  const openMinutes = Math.min(...ranges.map((r) => r.start));
  const closeMinutes = Math.max(...ranges.map((r) => r.end));

  return { status: "ok", openMinutes, closeMinutes, rawLine };
};

export const formatMinutesAsHHMM = (minutes: number): string => {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export const formatClock = (d: Date): string => {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
