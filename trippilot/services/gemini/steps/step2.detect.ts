import { callGemini } from "../client";
import type { GeminiConflicts, NormalizedConstraintSnapshot } from "../schema";

export async function detectConflicts(
  normalized: NormalizedConstraintSnapshot,
): Promise<GeminiConflicts> {
  const systemPrompt =
    "You are a travel constraint analyzer. Return ONLY valid JSON.";

  const userPrompt = `Given this trip constraint snapshot (JSON), identify conflicts and risky stops.

Rules:
- Output MUST be JSON and match this TypeScript shape:
  {
    riskLevel: "low"|"medium"|"high",
    riskyStops: { placeId: string, reason: string }[],
    conflicts: { kind: "timing"|"distance"|"closed"|"budget"|"other", placeId?: string, severity: "low"|"medium"|"high", message: string }[]
  }
- Be conservative: if uncertain, use kind="other" and severity="low".
- Use the provided placeId values when referencing stops.

SNAPSHOT:\n${JSON.stringify(normalized)}`;

  const out = await callGemini({
    systemPrompt,
    userPrompt,
    temperature: 0.2,
  });

  // Best-effort validation/coercion.
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
    conflicts: Array.isArray(o.conflicts)
      ? o.conflicts
          .map((c: any) => ({
            kind:
              c?.kind === "timing" ||
              c?.kind === "distance" ||
              c?.kind === "closed" ||
              c?.kind === "budget"
                ? c.kind
                : "other",
            placeId: c?.placeId ? String(c.placeId).trim() : undefined,
            severity:
              c?.severity === "high" || c?.severity === "medium"
                ? c.severity
                : "low",
            message: String(c?.message || "").trim(),
          }))
          .filter((c: any) => c.message)
      : [],
  };
}
