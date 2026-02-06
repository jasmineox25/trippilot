import { callGemini } from "../client";
import type { GeminiConflicts, GeminiDecision } from "../schema";

export async function decide(
  conflicts: GeminiConflicts,
): Promise<GeminiDecision> {
  const systemPrompt =
    "You are a travel decision engine. Return ONLY valid JSON.";

  const userPrompt = `Given detected conflicts (JSON), propose structured actions.

Constraints:
- Output MUST be JSON matching:
  {
    riskLevel: "low"|"medium"|"high",
    riskyStops: { placeId: string, reason: string }[],
    suggestedActions: { type: "reorder"|"reduce_stay"|"start_earlier", target?: string, value?: number }[]
  }
- If you suggest reorder, set target to a comma-separated list of placeIds in the NEW desired order.
- If you suggest reduce_stay, set target to a placeId and value to minutes.
- If you suggest start_earlier, set value to minutes earlier.

CONFLICTS:\n${JSON.stringify(conflicts)}`;

  const out = await callGemini({
    systemPrompt,
    userPrompt,
    temperature: 0.2,
  });

  const o = (out as any) || {};
  const riskLevel =
    o.riskLevel === "high" || o.riskLevel === "medium" ? o.riskLevel : "low";

  return {
    riskLevel,
    riskyStops: Array.isArray(o.riskyStops)
      ? o.riskyStops
          .map((x: any) => ({
            placeId: String(x?.placeId || "").trim(),
            reason: String(x?.reason || "").trim(),
          }))
          .filter((x: any) => x.placeId && x.reason)
      : [],
    suggestedActions: Array.isArray(o.suggestedActions)
      ? o.suggestedActions
          .map((a: any) => ({
            type:
              a?.type === "reorder" ||
              a?.type === "reduce_stay" ||
              a?.type === "start_earlier"
                ? a.type
                : "reorder",
            target: a?.target != null ? String(a.target).trim() : undefined,
            value:
              typeof a?.value === "number" && Number.isFinite(a.value)
                ? a.value
                : undefined,
          }))
          .filter((a: any) => a.type)
      : [],
  };
}
