import { callGemini } from "./client";
import type { Place } from "../../data";
import { getLocale } from "../../i18n/i18n";

export interface BudgetEstimateItem {
  name: string;
  category: "ticket" | "food" | "transport" | "other";
  estimatedCost: string; // "20 EUR" or "100-150 CNY"
  notes?: string;
}

export interface BudgetEstimateResponse {
  currency: string;
  totalRange: string;
  items: BudgetEstimateItem[];
  dailyCostPerPerson: string;
  disclaimer: string;
}

export const estimateTripBudget = async (
  places: Place[],
  targetLocale?: string,
  currencyCode?: string,
): Promise<BudgetEstimateResponse> => {
  const locale = targetLocale || getLocale();
  const currency = currencyCode || (locale === "zh" ? "CNY" : "USD"); // Simple default
  const langName =
    locale === "zh"
      ? "Simplified Chinese"
      : locale === "ja"
        ? "Japanese"
        : locale === "ko"
          ? "Korean"
          : locale === "fr"
            ? "French"
            : locale === "es"
              ? "Spanish"
              : locale === "de"
                ? "German"
                : locale === "pt"
                  ? "Portuguese"
                  : locale === "ru"
                    ? "Russian"
                    : "English";

  const placesList = places
    .map(
      (p) =>
        `- ${p.name} (${p.loc}) [Type: ${p.category || p.type || "unknown"}]`,
    )
    .join("\n");

  const systemPrompt = `You are a travel budget expert.
Estimate the travel costs for the provided list of attractions/places.
Also estimate a reasonable daily food/transport cost for the implicit destination city.
Target Currency: ${currency}.
Output Language: ${langName}.

Return ONLY valid JSON identifying the estimated cost for each specific place (ticket price) and general daily costs.
All text fields (name, notes, dailyCostPerPerson description, disclaimer) MUST be in ${langName}.
If a place is usually free, price should be "0".
If a place has a ticket, estimate the adult price.

Schema:
{
  "currency": "${currency}",
  "totalRange": "e.g. 500-600",
  "dailyCostPerPerson": "e.g. 50-80 (Food & Transport)",
  "items": [
    {
      "name": "Place Name (in ${langName})",
      "category": "ticket" | "food" | "transport" | "other",
      "estimatedCost": "number or range",
      "notes": "Short notes about ticket (e.g. valid for 24h, online recommended) in ${langName}"
    }
  ],
  "disclaimer": "Short disclaimer about these being AI estimates, in ${langName}."
}
`;

  const userPrompt = `Please estimate the budget for these places:\n${placesList}`;

  try {
    const res = await callGemini({
      systemPrompt,
      userPrompt,
      temperature: 0.2, // Low temperature for more factual cost data
    });

    // Handle potential raw string response or parsed object
    let parsed: any = res;
    if (typeof res !== "object") {
      // Ideally callGemini returns parsed object if it finds JSON, but let's be safe
      // We can iterate the response logic from client.ts if needed, but client.ts usually tries to parse.
      // For now assume client.ts handles JSON parsing if possible, or we might need to verify.
    }

    // Validate basics
    if (!parsed || !parsed.items) {
      throw new Error("Invalid budget response format");
    }

    return parsed as BudgetEstimateResponse;
  } catch (e) {
    console.warn("Budget estimate failed", e);
    throw e;
  }
};
