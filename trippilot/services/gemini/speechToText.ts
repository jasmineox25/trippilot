import { callGemini } from "./client";

export type GeminiSpeechToTextResult = {
  text: string;
  detectedLanguage?: string;
};

const isResult = (v: any): v is GeminiSpeechToTextResult => {
  if (!v || typeof v !== "object") return false;
  if (typeof v.text !== "string" || v.text.trim().length === 0) return false;
  if (v.detectedLanguage != null && typeof v.detectedLanguage !== "string")
    return false;
  return true;
};

export async function transcribeSpeechWithGemini(input: {
  audioBase64: string;
  mimeType: string;
  targetLanguage?: string; // e.g. 'auto' | 'zh' | 'en' | 'ja' ...
}): Promise<GeminiSpeechToTextResult> {
  const audioBase64 = (input.audioBase64 || "").trim();
  const mimeType = (input.mimeType || "").trim() || "audio/webm";
  const targetLanguage = (input.targetLanguage || "auto").trim().toLowerCase();

  if (!audioBase64) throw new Error("Missing audio data.");

  const systemPrompt =
    "You are a speech-to-text transcriber. Output ONLY valid JSON (no markdown, no extra text).";

  const langInstruction =
    targetLanguage === "auto"
      ? "Transcribe in the original spoken language."
      : `Transcribe and translate into ${targetLanguage}.`;

  const userPrompt =
    "Task:\n" +
    `- ${langInstruction}\n` +
    "- Remove filler words, keep punctuation reasonable.\n" +
    "- Output JSON: {text: string, detectedLanguage?: string}.\n" +
    "- detectedLanguage should be a short language tag if you can (e.g., zh, en, ja, ko, fr, es, de).\n";

  const raw = await callGemini({
    systemPrompt,
    userPrompt,
    temperature: 0.1,
    parts: [
      {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      },
    ],
  });

  if (isResult(raw)) {
    return {
      text: raw.text.trim(),
      detectedLanguage: raw.detectedLanguage?.trim(),
    };
  }

  // Fallback if Gemini returned something else but client extracted rawText.
  const fallbackText =
    typeof (raw as any)?.rawText === "string"
      ? String((raw as any).rawText)
      : "";

  if (fallbackText.trim()) {
    return { text: fallbackText.trim() };
  }

  throw new Error("Gemini returned an invalid speech-to-text result.");
}
