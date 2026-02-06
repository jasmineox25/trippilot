import type { ConstraintSnapshot, GeminiDecision } from "./gemini/schema";
import { normalize } from "./gemini/steps/step1.normalize";
import { detectConflicts } from "./gemini/steps/step2.detect";
import { decide } from "./gemini/steps/step3.decide";

export async function runGeminiReasoning(
  snapshot: ConstraintSnapshot,
): Promise<GeminiDecision> {
  const normalized = await normalize(snapshot);
  const conflicts = await detectConflicts(normalized);
  const decision = await decide(conflicts);
  return decision;
}
