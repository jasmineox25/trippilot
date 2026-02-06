import type { WeatherNow } from "./weather";
import { getLocale, type Locale } from "../i18n/i18n";

export type Suitability = {
  level: "good" | "meh" | "bad";
  label: string;
  reason: string;
};

const OUTDOOR_TYPES = new Set([
  "park",
  "garden",
  "natural_feature",
  "tourist_attraction",
  "point_of_interest",
  "amusement_park",
  "zoo",
  "beach",
]);

const INDOOR_TYPES = new Set([
  "museum",
  "art_gallery",
  "shopping_mall",
  "store",
  "restaurant",
  "cafe",
  "bar",
  "movie_theater",
  "bowling_alley",
  "aquarium",
]);

const classifyIndoorOutdoor = (types?: string[]) => {
  const t = (types || []).map((x) => String(x).toLowerCase());
  const hasOutdoor = t.some((x) => OUTDOOR_TYPES.has(x));
  const hasIndoor = t.some((x) => INDOOR_TYPES.has(x));
  if (hasIndoor && !hasOutdoor) return "indoor" as const;
  if (hasOutdoor && !hasIndoor) return "outdoor" as const;
  if (hasIndoor && hasOutdoor) return "mixed" as const;
  return "unknown" as const;
};

export const assessDestinationSuitability = (
  placeTypes: string[] | undefined,
  weather: WeatherNow | undefined,
  locale: Locale = getLocale(),
): Suitability | null => {
  if (!weather) return null;

  const pick = (zh: string, en: string, ja?: string): string => {
    if (locale === "zh") return zh;
    if (locale === "ja") return ja ?? en;
    return en;
  };

  const kind = classifyIndoorOutdoor(placeTypes);
  const precip = Math.max(
    0,
    Number(weather.precipitationMm ?? 0) || 0,
    Number(weather.rainMm ?? 0) || 0,
    Number(weather.showersMm ?? 0) || 0,
  );
  const wind = Number(weather.windKph ?? 0) || 0;
  const temp = weather.temperatureC;

  // Heuristics (simple + explainable)
  if (kind === "outdoor") {
    if (precip >= 2) {
      return {
        level: "bad",
        label: pick("不建议", "Not recommended", "おすすめしません"),
        reason: pick(
          `户外景点且有降水（约 ${precip.toFixed(1)}mm）`,
          `Outdoor place with rain (~${precip.toFixed(1)}mm)`,
          `屋外スポットで雨（約${precip.toFixed(1)}mm）`,
        ),
      };
    }
    if (wind >= 35) {
      return {
        level: "meh",
        label: pick("谨慎", "Use caution", "注意"),
        reason: pick(
          `户外景点且风较大（约 ${Math.round(wind)}km/h）`,
          `Outdoor place with strong wind (~${Math.round(wind)}km/h)`,
          `屋外スポットで風が強い（約${Math.round(wind)}km/h）`,
        ),
      };
    }
  }

  if (kind === "indoor") {
    if (precip >= 2) {
      return {
        level: "good",
        label: pick("适合", "Good", "良い"),
        reason: pick(
          "室内为主，下雨影响较小",
          "Mostly indoors; rain impact is low",
          "屋内中心なので雨の影響が少ない",
        ),
      };
    }
  }

  if (typeof temp === "number") {
    if (temp <= 0 && kind === "outdoor") {
      return {
        level: "meh",
        label: pick("谨慎", "Use caution", "注意"),
        reason: pick(
          `气温较低（约 ${Math.round(temp)}°C）`,
          `Low temperature (~${Math.round(temp)}°C)`,
          `気温が低い（約${Math.round(temp)}°C）`,
        ),
      };
    }
    if (temp >= 33 && kind === "outdoor") {
      return {
        level: "meh",
        label: pick("谨慎", "Use caution", "注意"),
        reason: pick(
          `气温较高（约 ${Math.round(temp)}°C）`,
          `High temperature (~${Math.round(temp)}°C)`,
          `気温が高い（約${Math.round(temp)}°C）`,
        ),
      };
    }
  }

  // Default
  if (kind === "outdoor" && precip > 0) {
    return {
      level: "meh",
      label: pick("谨慎", "Use caution", "注意"),
      reason: pick(
        "户外景点，可能有小雨",
        "Outdoor place; light rain possible",
        "屋外スポットのため小雨の可能性",
      ),
    };
  }

  return {
    level: "good",
    label: pick("适合", "Good", "良い"),
    reason: pick("当前天气较平稳", "Weather looks stable", "天気は概ね安定"),
  };
};
