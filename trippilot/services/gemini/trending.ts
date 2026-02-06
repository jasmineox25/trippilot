import { callGemini } from "./client";
import { getLocale, type Locale } from "../../i18n/i18n";

export type GeminiTrendingSuggestion = {
  label: string;
  query: string;
  category: string;
  reason?: string;
};

const isSuggestion = (v: any): v is GeminiTrendingSuggestion => {
  if (!v || typeof v !== "object") return false;
  if (typeof v.label !== "string" || v.label.trim().length === 0) return false;
  if (typeof v.query !== "string" || v.query.trim().length === 0) return false;
  if (typeof v.category !== "string" || v.category.trim().length === 0)
    return false;
  if (v.reason != null && typeof v.reason !== "string") return false;
  return true;
};

export async function getGeminiTrendingSuggestions(input: {
  locationHint: string;
  dateISO?: string;
  count?: number;
  locale?: Locale;
}): Promise<GeminiTrendingSuggestion[]> {
  const locationHint = (input.locationHint || "").trim();
  if (!locationHint) return [];

  const count = Math.min(6, Math.max(1, Number(input.count ?? 3) || 3));
  const dateISO = (input.dateISO || "").trim();
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

  const categoriesZh =
    "历史古迹, 地标建筑, 博物馆, 美术馆, 自然风景, 公园, 街区/步行街, 美食, 购物, 夜景, 休闲";
  const categoriesEn =
    "Historic site, Landmark, Museum, Art gallery, Nature, Park, Street / walk, Food, Shopping, Night view, Relaxation";
  const categories = locale === "zh" ? categoriesZh : categoriesEn;

  const systemPrompt =
    "You are a travel assistant. Output ONLY valid JSON (no markdown).";

  const userPrompt =
    `Generate ${count} trending tourist attractions for the user based on the starting location hint.\n` +
    `Location hint: ${locationHint}\n` +
    (dateISO ? `Date (ISO): ${dateISO}\n` : "") +
    "Return a JSON array. Each item must be: {label: string, query: string, category: string, reason?: string}.\n" +
    `- Output language: ${outputLanguage}. Use this language for label and reason.\n` +
    `- Use ${outputLanguage} only (do not mix other languages).\n` +
    "- label: short display name suitable for cards.\n" +
    "- query: a Google Places text query likely to find the attraction (include city/area keywords).\n" +
    `- category: choose one of: ${categories}.\n` +
    (locale === "zh"
      ? "- reason: <= 12 Chinese characters, user-friendly.\n"
      : locale === "ja"
        ? "- reason: <= 20 Japanese characters, user-friendly.\n"
        : locale === "ko"
          ? "- reason: <= 20 Korean characters, user-friendly.\n"
          : "- reason: <= 12 words, user-friendly.\n") +
    "Avoid duplicates. Avoid unsafe or adult content.";

  const raw = await callGemini({
    systemPrompt,
    userPrompt,
    temperature: 0.4,
  });

  const arr = Array.isArray(raw) ? raw : (raw as any)?.items;
  if (!Array.isArray(arr)) return [];

  const out: GeminiTrendingSuggestion[] = [];
  const seen = new Set<string>();

  for (const item of arr) {
    if (!isSuggestion(item)) continue;
    const key = item.query.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      label: item.label.trim(),
      query: item.query.trim(),
      category: item.category.trim(),
      reason: item.reason?.trim(),
    });
    if (out.length >= count) break;
  }

  return out;
}
