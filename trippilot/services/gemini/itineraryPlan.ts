import { callGemini } from "./client";
import { getLocale, type Locale } from "../../i18n/i18n";

export type GeminiItineraryPlace = {
  label: string;
  query: string;
  category: string;
  durationMinutes: number;
  timeSlot?: string;
  notes?: string;
  reason?: string;
};

export type GeminiItineraryDayPlan = {
  day: number;
  title?: string;
  items: GeminiItineraryPlace[];
};

export type GeminiItineraryPlan = {
  cityHint?: string;
  days: GeminiItineraryDayPlan[];
};

const isPlace = (v: any): v is GeminiItineraryPlace => {
  if (!v || typeof v !== "object") return false;
  if (typeof v.label !== "string" || v.label.trim().length === 0) return false;
  if (typeof v.query !== "string" || v.query.trim().length === 0) return false;
  if (typeof v.category !== "string" || v.category.trim().length === 0)
    return false;
  if (
    typeof v.durationMinutes !== "number" ||
    !Number.isFinite(v.durationMinutes)
  )
    return false;
  if (v.timeSlot != null && typeof v.timeSlot !== "string") return false;
  if (v.notes != null && typeof v.notes !== "string") return false;
  if (v.reason != null && typeof v.reason !== "string") return false;
  return true;
};

const clampInt = (n: unknown, min: number, max: number, fallback: number) => {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
};

export async function getGeminiItineraryPlan(input: {
  itineraryText: string;
  maxDays?: number;
  maxItemsPerDay?: number;
  locale?: Locale;
}): Promise<GeminiItineraryPlan> {
  const itineraryText = (input.itineraryText || "").trim();
  if (!itineraryText) return { days: [] };

  const locale = input.locale ?? getLocale();
  const outputLanguage = (() => {
    switch (locale) {
      case "zh":
        return "Chinese";
      case "ja":
        return "Japanese";
      case "ko":
        return "Korean";
      case "fr":
        return "French";
      case "es":
        return "Spanish";
      case "de":
        return "German";
      case "pt":
        return "Portuguese";
      case "ru":
        return "Russian";
      default:
        return "English";
    }
  })();

  const maxDays = clampInt(input.maxDays ?? 4, 1, 7, 4);
  const maxItemsPerDay = clampInt(input.maxItemsPerDay ?? 6, 3, 10, 6);

  const systemPrompt =
    "You are a travel planner. Output ONLY valid JSON (no markdown, no extra text).";

  const categoriesZh =
    "历史古迹, 地标建筑, 博物馆, 美术馆, 自然风景, 公园, 街区/步行街, 美食, 购物, 夜景, 休闲";
  const categoriesEn =
    "Historic site, Landmark, Museum, Art gallery, Nature, Park, Street / walk, Food, Shopping, Night view, Relaxation";
  const categories = locale === "zh" ? categoriesZh : categoriesEn;

  const timeSlots = (() => {
    switch (locale) {
      case "zh":
        return "上午, 中午, 下午, 晚上";
      case "ja":
        return "午前, 正午, 午後, 夜";
      default:
        return "Morning, Noon, Afternoon, Evening";
    }
  })();

  const userPrompt =
    "The user wrote a rough trip itinerary (free-form, possibly Chinese).\n" +
    "Turn it into a concrete sightseeing plan that is actionable.\n\n" +
    `User itinerary:\n${itineraryText}\n\n` +
    `Constraints:\n- Up to ${maxDays} days\n- Up to ${maxItemsPerDay} places per day\n` +
    "- Each place MUST include an attribute/category and an estimated stay duration\n" +
    "- Prefer famous, real places that can be found by Google Places\n" +
    "- Avoid adult/unsafe content\n\n" +
    `Output language: ${outputLanguage}. Use this language for day titles, labels, notes, and timeSlot. Do not switch languages unless the user explicitly asks.\n\n` +
    "Return ONE JSON object with this exact structure:\n" +
    "{\n" +
    "  cityHint?: string,\n" +
    "  days: [\n" +
    "    {\n" +
    "      day: number,\n" +
    "      title?: string,\n" +
    "      items: [\n" +
    "        {\n" +
    "          label: string,\n" +
    "          query: string,\n" +
    "          category: string,\n" +
    "          durationMinutes: number,\n" +
    "          timeSlot?: string,\n" +
    "          notes?: string\n" +
    "        }\n" +
    "      ]\n" +
    "    }\n" +
    "  ]\n" +
    "}\n\n" +
    "Field rules:\n" +
    `- label: POI name in ${outputLanguage} (translate/place-name romanization is OK if needed)\n` +
    "- query: a Google Places text query, include city/country to disambiguate (e.g., '故宫 北京', 'Louvre Museum Paris')\n" +
    `- category: choose one of: ${categories}\n` +
    "- durationMinutes: typical stay time (30-240)\n" +
    `- timeSlot: one of: ${timeSlots} (optional)\n`;

  const normalizeCategory = (raw: string): string => {
    const s = String(raw || "").trim();
    if (!s) return s;

    if (locale !== "zh") {
      // Best-effort: map common Chinese categories to English.
      const map: Record<string, string> = {
        历史古迹: "Historic site",
        地标建筑: "Landmark",
        博物馆: "Museum",
        美术馆: "Art gallery",
        自然风景: "Nature",
        公园: "Park",
        "街区/步行街": "Street / walk",
        美食: "Food",
        购物: "Shopping",
        夜景: "Night view",
        休闲: "Relaxation",
      };
      if (map[s]) return map[s];
    }

    return s;
  };

  const normalizeTimeSlot = (raw?: string): string | undefined => {
    const s = typeof raw === "string" ? raw.trim() : "";
    if (!s) return undefined;

    if (locale !== "zh") {
      const map: Record<string, string> = {
        上午: locale === "ja" ? "午前" : "Morning",
        中午: locale === "ja" ? "正午" : "Noon",
        下午: locale === "ja" ? "午後" : "Afternoon",
        晚上: locale === "ja" ? "夜" : "Evening",
      };
      if (map[s]) return map[s];
    }

    return s;
  };

  const raw = await callGemini({
    systemPrompt,
    userPrompt,
    temperature: 0.35,
  });

  const asObj = raw && typeof raw === "object" ? (raw as any) : null;
  const days = Array.isArray(asObj?.days) ? asObj.days : null;

  if (!Array.isArray(days)) {
    const rawText =
      typeof (raw as any)?.rawText === "string" ? (raw as any).rawText : "";
    throw new Error(
      rawText
        ? `Gemini returned non-JSON plan. Raw: ${rawText.slice(0, 200)}`
        : "Gemini returned an invalid plan format.",
    );
  }

  const outDays: GeminiItineraryDayPlan[] = [];

  for (const d of days) {
    const dayNum = clampInt(d?.day, 1, maxDays, 1);
    const itemsRaw = Array.isArray(d?.items) ? d.items : [];

    const items: GeminiItineraryPlace[] = [];
    const seen = new Set<string>();

    for (const it of itemsRaw) {
      if (!isPlace(it)) continue;
      const query = it.query.trim();
      const key = query.toLowerCase();
      if (!query || seen.has(key)) continue;
      seen.add(key);

      items.push({
        label: it.label.trim(),
        query,
        category: normalizeCategory(it.category),
        durationMinutes: clampInt(it.durationMinutes, 30, 240, 90),
        timeSlot: normalizeTimeSlot(it.timeSlot),
        notes: it.notes?.trim(),
      });

      if (items.length >= maxItemsPerDay) break;
    }

    if (items.length === 0) continue;

    outDays.push({
      day: dayNum,
      title: typeof d?.title === "string" ? d.title.trim() : undefined,
      items,
    });

    if (outDays.length >= maxDays) break;
  }

  outDays.sort((a, b) => a.day - b.day);

  return {
    cityHint:
      typeof asObj?.cityHint === "string" ? asObj.cityHint.trim() : undefined,
    days: outDays,
  };
}
