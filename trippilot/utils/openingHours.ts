import { getLocale, l, type Locale } from "../i18n/i18n";

export type OpeningHoursInfo = {
  openNow?: boolean;
  weekdayText?: string[];
};

const asTextLine = (v: any): string => {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    if (typeof v.text === "string") return v.text;
    if (typeof v.name === "string") return v.name;
  }
  return v == null ? "" : String(v);
};

const toTextLines = (value: any): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const lines = value.map(asTextLine).filter((s) => s.trim().length > 0);
  return lines.length > 0 ? lines : undefined;
};

const safeIsOpen = (place: any): boolean | undefined => {
  if (!place || typeof place.isOpen !== "function") return undefined;

  try {
    const result = place.isOpen();
    if (typeof result === "boolean") return result;

    // Some versions return a Promise<boolean> that may reject unless using beta.
    if (result && typeof result.then === "function") {
      void result.catch(() => undefined);
    }
  } catch {
    // isOpen() may exist but throw unless using the beta channel.
  }

  return undefined;
};

const weekdayNamesEn = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const weekdayNamesZh = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const weekdayNamesJa = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
];

const pickTodayLine = (weekdayText?: string[]): string | null => {
  if (!weekdayText || weekdayText.length === 0) return null;

  const day = new Date().getDay();
  const en = weekdayNamesEn[day];
  const zh = weekdayNamesZh[day];
  const ja = weekdayNamesJa[day];

  // Try match English prefix like "Monday:" (case-insensitive)
  const enLine = weekdayText.find((line) =>
    String(line).trim().toLowerCase().startsWith(en),
  );
  if (enLine) return enLine;

  // Try match Japanese prefix like "月曜日:"
  const jaLine = weekdayText.find((line) => {
    const s = String(line).trim();
    return (
      s.startsWith(ja) || s.startsWith(`${ja}:`) || s.startsWith(`${ja}：`)
    );
  });
  if (jaLine) return jaLine;

  // Try match Chinese prefix like "周一" / "星期一"
  const zhLine = weekdayText.find((line) => {
    const s = String(line).trim();
    return s.startsWith(zh) || s.startsWith(`星期${zh.slice(1)}`);
  });
  if (zhLine) return zhLine;

  // Fallback: first line
  return String(weekdayText[0]);
};

export const formatOpeningHoursSummary = (
  openingHours?: OpeningHoursInfo,
  locale: Locale = getLocale(),
): string | null => {
  if (!openingHours) return null;

  const parts: string[] = [];
  if (openingHours.openNow === true)
    parts.push(l("营业中", "Open now", locale));
  else if (openingHours.openNow === false)
    parts.push(l("未营业", "Closed", locale));

  const todayLine = pickTodayLine(openingHours.weekdayText);
  if (todayLine) parts.push(`${l("今日: ", "Today: ", locale)}${todayLine}`);

  if (parts.length === 0) return null;
  return parts.join(" • ");
};

export const extractOpeningHoursFromNewPlace = (
  place: any,
): OpeningHoursInfo | undefined => {
  if (!place) return undefined;

  // Google Places (New) commonly uses camelCase fields.
  const current =
    place.currentOpeningHours ||
    place.current_opening_hours ||
    place.current_opening_hours;
  const regular = place.regularOpeningHours || place.regular_opening_hours;

  const weekdayText =
    current?.weekdayText ||
    current?.weekday_text ||
    current?.weekdayDescriptions ||
    current?.weekday_descriptions ||
    current?.weekdayDescriptionsText ||
    regular?.weekdayText ||
    regular?.weekday_text ||
    regular?.weekdayDescriptions ||
    regular?.weekday_descriptions ||
    regular?.weekdayTexts ||
    regular?.weekday_texts;

  let openNow = current?.openNow ?? current?.open_now ?? place.openNow;
  if (openNow === undefined) {
    const v = safeIsOpen(place);
    if (typeof v === "boolean") openNow = v;
  }

  if (!weekdayText && openNow === undefined) return undefined;
  return {
    openNow: typeof openNow === "boolean" ? openNow : undefined,
    weekdayText: toTextLines(weekdayText),
  };
};

export const extractOpeningHoursFromLegacyShim = (
  legacyPlace: any,
): OpeningHoursInfo | undefined => {
  if (!legacyPlace) return undefined;
  const opening = legacyPlace.opening_hours;
  if (!opening) return undefined;

  const weekdayText = opening.weekday_text;
  const openNow = opening.open_now;

  if (!weekdayText && openNow === undefined) return undefined;
  return {
    openNow: typeof openNow === "boolean" ? openNow : undefined,
    weekdayText: toTextLines(weekdayText),
  };
};
