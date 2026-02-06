import { getLocale, type Locale } from "../i18n/i18n";

export type RecommendedStay = {
  minutes: number;
  reason?: string;
};

const clampMinutes = (minutes: number) => {
  if (!Number.isFinite(minutes)) return 60;
  return Math.max(15, Math.min(8 * 60, Math.round(minutes / 5) * 5));
};

const parseDurationFromTypeString = (typeStr?: string): number | null => {
  if (!typeStr) return null;

  // Examples in this repo: "Historic • 1h", "Nature • 2h"
  const normalized = String(typeStr);

  const hourMatch = normalized.match(/\b(\d+(?:\.\d+)?)\s*h\b/i);
  if (hourMatch?.[1]) {
    const hours = Number(hourMatch[1]);
    if (Number.isFinite(hours)) return clampMinutes(hours * 60);
  }

  const minMatch = normalized.match(/\b(\d+(?:\.\d+)?)\s*m(?:in)?\b/i);
  if (minMatch?.[1]) {
    const mins = Number(minMatch[1]);
    if (Number.isFinite(mins)) return clampMinutes(mins);
  }

  return null;
};

const typeMinutesTable: Array<{
  key: string;
  minutes: number;
  reason: string;
}> = [
  { key: "amusement_park", minutes: 240, reason: "游乐园通常需要更长时间" },
  { key: "zoo", minutes: 180, reason: "动物园通常需要更长时间" },
  { key: "aquarium", minutes: 150, reason: "水族馆通常需要更长时间" },
  { key: "theme_park", minutes: 240, reason: "主题乐园通常需要更长时间" },

  { key: "museum", minutes: 120, reason: "博物馆一般至少 1–2 小时" },
  { key: "art_gallery", minutes: 90, reason: "美术馆一般 1–1.5 小时" },

  { key: "tourist_attraction", minutes: 90, reason: "热门景点通常 1–2 小时" },
  { key: "landmark", minutes: 60, reason: "地标景点通常 1 小时左右" },
  { key: "point_of_interest", minutes: 60, reason: "一般景点通常 1 小时左右" },

  { key: "park", minutes: 90, reason: "公园通常 1–2 小时" },
  { key: "garden", minutes: 90, reason: "花园/庭园通常 1–2 小时" },
  { key: "natural_feature", minutes: 120, reason: "自然景点通常 2 小时左右" },

  { key: "church", minutes: 60, reason: "宗教建筑通常 1 小时左右" },
  { key: "hindu_temple", minutes: 75, reason: "寺庙通常 1–1.5 小时" },
  { key: "mosque", minutes: 60, reason: "宗教建筑通常 1 小时左右" },
  { key: "synagogue", minutes: 60, reason: "宗教建筑通常 1 小时左右" },

  { key: "shopping_mall", minutes: 120, reason: "商场逛街通常 2 小时左右" },
  { key: "store", minutes: 60, reason: "购物点通常 1 小时左右" },

  { key: "restaurant", minutes: 75, reason: "用餐通常 1–1.5 小时" },
  { key: "cafe", minutes: 45, reason: "咖啡/下午茶通常 30–60 分钟" },
  { key: "bar", minutes: 120, reason: "酒吧通常 1–2 小时" },
  { key: "night_club", minutes: 180, reason: "夜店通常更久" },

  { key: "spa", minutes: 120, reason: "SPA 通常 2 小时左右" },

  { key: "beach", minutes: 180, reason: "海滩通常更久" },
];

export const formatStayMinutes = (
  minutes: number,
  locale: Locale = getLocale(),
): string => {
  const total = clampMinutes(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;

  switch (locale) {
    case "zh": {
      if (h <= 0) return `${m}分钟`;
      if (m === 0) return `${h}小时`;
      return `${h}小时${m}分钟`;
    }
    case "ja": {
      if (h <= 0) return `${m}分`;
      if (m === 0) return `${h}時間`;
      return `${h}時間${m}分`;
    }
    default: {
      if (h <= 0) return `${m}m`;
      if (m === 0) return `${h}h`;
      return `${h}h ${m}m`;
    }
  }
};

export const getRecommendedStay = (place: {
  tag?: string;
  type?: string;
  placeTypes?: string[];
  name?: string;
}): RecommendedStay | null => {
  // Don’t recommend for start/current location nodes
  if (place.tag === "Start") return null;

  // If the repo already encodes a duration in type, prefer that.
  const parsed = parseDurationFromTypeString(place.type);
  if (parsed != null) return { minutes: parsed, reason: "来自行程模板时长" };

  const types = (place.placeTypes || []).map((t) => String(t).toLowerCase());

  for (const rule of typeMinutesTable) {
    if (types.includes(rule.key)) {
      return { minutes: clampMinutes(rule.minutes), reason: rule.reason };
    }
  }

  // Heuristic fallback: keywords in name/type
  const haystack = `${place.name ?? ""} ${place.type ?? ""}`.toLowerCase();
  if (haystack.includes("temple") || haystack.includes("shrine")) {
    return { minutes: 90, reason: "宗教/历史景点通常 1–2 小时" };
  }
  if (haystack.includes("castle") || haystack.includes("palace")) {
    return { minutes: 120, reason: "城堡/宫殿通常 2 小时左右" };
  }

  // Default
  return { minutes: 60, reason: "默认建议" };
};
