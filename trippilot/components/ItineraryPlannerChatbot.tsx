import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import {
  getGeminiItineraryPlan,
  type GeminiItineraryPlace,
  type GeminiItineraryPlan,
} from "../services/gemini/itineraryPlan";
import { transcribeSpeechWithGemini } from "../services/gemini/speechToText";
import { callGemini } from "../services/gemini/client";
import { getLocale, type Locale } from "../i18n/i18n";
import { useI18n } from "../i18n/react";

export type ItineraryPlannerPlace = GeminiItineraryPlace & {
  day: number;
};

interface ItineraryPlannerChatbotProps {
  onPickPlace: (place: ItineraryPlannerPlace) => void;
  className?: string;
}

const formatDuration = (
  minutes: number,
  locale: Locale = getLocale(),
): string => {
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  const total = Math.round(minutes);
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
      if (h <= 0) return `${m} min`;
      if (m === 0) return `${h}h`;
      return `${h}h ${m}m`;
    }
  }
};

const categoryColor = (category: string): string => {
  const c = (category || "").trim();
  const lower = c.toLowerCase();

  if (c.includes("博物馆") || c.includes("美术馆"))
    return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200";
  if (c.includes("历史") || c.includes("古迹"))
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  if (c.includes("地标"))
    return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200";
  if (c.includes("自然") || c.includes("公园"))
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  if (c.includes("美食"))
    return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
  if (c.includes("购物"))
    return "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200";
  if (c.includes("夜景"))
    return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100";

  // English categories
  if (lower.includes("museum") || lower.includes("art"))
    return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200";
  if (lower.includes("historic") || lower.includes("heritage"))
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  if (lower.includes("landmark"))
    return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200";
  if (lower.includes("nature") || lower.includes("park"))
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  if (lower.includes("food") || lower.includes("restaurant"))
    return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
  if (lower.includes("shopping") || lower.includes("market"))
    return "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200";
  if (lower.includes("night") || lower.includes("view"))
    return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100";

  return "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
};

const formatCategoryLabel = (
  category: string,
  l: (zh: string, en: string) => string,
): string => {
  const c = (category || "").trim();
  if (!c) return "";
  const lower = c.toLowerCase();

  // Chinese categories
  if (c === "历史古迹") return l("历史古迹", "Historic site");
  if (c === "地标建筑") return l("地标建筑", "Landmark");
  if (c === "博物馆") return l("博物馆", "Museum");
  if (c === "美术馆") return l("美术馆", "Art gallery");
  if (c === "自然风景") return l("自然风景", "Nature");
  if (c === "公园") return l("公园", "Park");
  if (c === "街区/步行街") return l("街区/步行街", "Street / walk");
  if (c === "美食") return l("美食", "Food");
  if (c === "购物") return l("购物", "Shopping");
  if (c === "夜景") return l("夜景", "Night view");
  if (c === "休闲") return l("休闲", "Relaxation");

  // English categories
  if (lower === "historic site" || lower.includes("historic"))
    return l("历史古迹", "Historic site");
  if (lower === "landmark" || lower.includes("landmark"))
    return l("地标建筑", "Landmark");
  if (lower === "museum" || lower.includes("museum"))
    return l("博物馆", "Museum");
  if (lower === "art gallery" || lower.includes("art"))
    return l("美术馆", "Art gallery");
  if (lower === "nature" || lower.includes("nature"))
    return l("自然风景", "Nature");
  if (lower === "park" || lower.includes("park")) return l("公园", "Park");
  if (lower === "street / walk" || lower.includes("street"))
    return l("街区/步行街", "Street / walk");
  if (
    lower === "food" ||
    lower.includes("food") ||
    lower.includes("restaurant")
  )
    return l("美食", "Food");
  if (
    lower === "shopping" ||
    lower.includes("shopping") ||
    lower.includes("market")
  )
    return l("购物", "Shopping");
  if (
    lower === "night view" ||
    lower.includes("night") ||
    lower.includes("view")
  )
    return l("夜景", "Night view");
  if (lower === "relaxation" || lower.includes("relax"))
    return l("休闲", "Relaxation");

  return c;
};

export const ItineraryPlannerChatbot: React.FC<
  ItineraryPlannerChatbotProps
> = ({ onPickPlace, className }) => {
  const { l, locale } = useI18n();
  const [mode, setMode] = useState<"chat" | "plan">("chat");
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsSmallScreen(Boolean(mq.matches));
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  const chatOutputLanguage = useMemo(() => {
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
  }, [locale]);

  type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    text: string;
    ts: number;
    suggestions?: GeminiItineraryPlace[];
  };

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "m0",
      role: "assistant",
      text: l(
        "我可以像 Gemini 一样跟你多轮聊天规划行程。告诉我：城市、天数、偏好、必去点、预算/交通方式。",
        "I can plan your trip in a multi-turn chat. Tell me: city, days, preferences, must-sees, budget/transport.",
      ),
      ts: Date.now(),
    },
  ]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatPicked, setChatPicked] = useState<Record<string, true>>({});
  const [chatClearArmed, setChatClearArmed] = useState(false);
  const chatClearTimerRef = useRef<number | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatStickToBottomRef = useRef(true);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const recordingTargetRef = useRef<"chat" | "plan">("plan");
  const [recordingTarget, setRecordingTarget] = useState<
    "chat" | "plan" | null
  >(null);
  const holdToTalkActiveRef = useRef(false);
  const recordStartedAtMsRef = useRef(0);

  const [itineraryText, setItineraryText] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLang, setVoiceLang] = useState<
    "auto" | "zh" | "en" | "ja" | "ko" | "fr" | "es" | "de"
  >("auto");
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<GeminiItineraryPlan | null>(null);
  const [picked, setPicked] = useState<Record<string, true>>({});

  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recordStopTimer, setRecordStopTimer] = useState<number | null>(null);

  const canSubmit = useMemo(
    () => itineraryText.trim().length > 0 && !loading,
    [itineraryText, loading],
  );

  const canVoice = useMemo(() => {
    return (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined" &&
      !voiceLoading
    );
  }, [voiceLoading]);

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read audio data."));
      reader.onload = () => {
        const s = String(reader.result || "");
        const comma = s.indexOf(",");
        resolve(comma >= 0 ? s.slice(comma + 1) : s);
      };
      reader.readAsDataURL(blob);
    });

  const startRecording = async (target: "chat" | "plan") => {
    if (!canVoice || isRecording) return;

    recordingTargetRef.current = target;

    const setVoiceErr = (msg: string | null) => {
      if (recordingTargetRef.current === "chat") setChatError(msg);
      else setError(msg);
    };

    const appendText = (nextText: string) => {
      if (!nextText.trim()) return;
      if (recordingTargetRef.current === "chat") {
        setChatDraft((prev) => {
          if (!prev.trim()) return nextText.trim();
          return `${prev.trim()}\n${nextText.trim()}`;
        });
      } else {
        setItineraryText((prev) => {
          if (!prev.trim()) return nextText.trim();
          return `${prev.trim()}\n${nextText.trim()}`;
        });
      }
    };

    try {
      setVoiceErr(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ];

      const pickMime = () => {
        for (const m of mimeCandidates) {
          try {
            if ((MediaRecorder as any).isTypeSupported?.(m)) return m;
          } catch {
            // ignore
          }
        }
        return "";
      };

      const rec = new MediaRecorder(stream, {
        mimeType: pickMime() || undefined,
      } as any);

      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      rec.onerror = () => {
        setVoiceErr(
          l(
            "录音失败，请检查浏览器权限。\n（需要麦克风授权）",
            "Recording failed. Please check browser permissions.\n(Microphone access is required)",
          ),
        );
      };

      rec.onstop = async () => {
        try {
          setIsRecording(false);
          setRecorder(null);
          setRecordingTarget(null);
          if (recordStopTimer) {
            window.clearTimeout(recordStopTimer);
            setRecordStopTimer(null);
          }

          // Stop tracks to release mic.
          stream.getTracks().forEach((t) => t.stop());

          const durationMs = Math.max(
            0,
            Date.now() - recordStartedAtMsRef.current,
          );

          // Ignore accidental taps / extremely short recordings.
          if (durationMs < 250) return;
          if (chunks.length === 0) return;
          const blob = new Blob(chunks, {
            type: rec.mimeType || "audio/webm",
          });

          setVoiceLoading(true);
          const audioBase64 = await blobToBase64(blob);
          const stt = await transcribeSpeechWithGemini({
            audioBase64,
            mimeType: blob.type || "audio/webm",
            targetLanguage: voiceLang,
          });

          appendText(stt.text || "");
        } catch (e: any) {
          console.warn("Voice transcription failed", e);
          setVoiceErr(
            e?.message ||
              l(
                "语音识别失败（Gemini）。",
                "Speech recognition failed (Gemini).",
              ),
          );
        } finally {
          setVoiceLoading(false);
        }
      };

      rec.start();
      setRecorder(rec);
      setIsRecording(true);
      setRecordingTarget(target);
      recordStartedAtMsRef.current = Date.now();

      // If the user already released the button while we were waiting for permissions,
      // stop immediately.
      if (!holdToTalkActiveRef.current) {
        try {
          if (rec.state === "recording") rec.stop();
        } catch {
          // ignore
        }
      }

      // Auto-stop after 25 seconds to avoid very large payloads.
      const timer = window.setTimeout(() => {
        try {
          if (rec.state === "recording") rec.stop();
        } catch {
          // ignore
        }
      }, 25_000);
      setRecordStopTimer(timer);
    } catch (e: any) {
      console.warn("startRecording failed", e);
      setVoiceErr(
        l(
          "无法开始录音：请允许麦克风权限或更换浏览器。",
          "Could not start recording: please allow microphone access or try another browser.",
        ),
      );
      setIsRecording(false);
      setRecorder(null);
      setRecordingTarget(null);
    }
  };

  const stopRecording = () => {
    try {
      if (!recorder) return;
      if (recorder.state === "recording") recorder.stop();
    } catch (e) {
      console.warn("stopRecording failed", e);
    }
  };

  const beginHoldToTalk = (
    e: React.PointerEvent<HTMLButtonElement>,
    target: "chat" | "plan",
  ) => {
    if (!canVoice) return;
    if (voiceLoading) return;
    if (isRecording) return;

    holdToTalkActiveRef.current = true;
    try {
      // Ensure we receive pointerup even if finger/mouse leaves the button.
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    e.preventDefault();
    void startRecording(target);
  };

  const endHoldToTalk = (
    e: React.PointerEvent<HTMLButtonElement>,
    target: "chat" | "plan",
  ) => {
    holdToTalkActiveRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (isRecording && recordingTarget === target) {
      stopRecording();
    }
  };

  const cancelHoldToTalk = (target: "chat" | "plan") => {
    holdToTalkActiveRef.current = false;
    if (isRecording && recordingTarget === target) stopRecording();
  };

  const run = async () => {
    const v = itineraryText.trim();
    if (!v || loading) return;

    try {
      setLoading(true);
      setError(null);
      setPicked({});

      const res = await getGeminiItineraryPlan({
        itineraryText: v,
        maxDays: 5,
        maxItemsPerDay: 6,
      });

      setPlan(res);
      if (!res.days || res.days.length === 0) {
        setError(
          l(
            "没有生成到可用的计划，换个描述试试（加上城市/天数更准）。",
            "No usable plan was generated. Try rephrasing (adding city/days helps).",
          ),
        );
      }
    } catch (e: any) {
      console.warn("Gemini itinerary plan failed", e);
      setPlan(null);
      setError(
        e?.message ||
          l(
            "生成失败，请检查 Gemini Key 或网络。",
            "Generation failed. Please check your Gemini key or network.",
          ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== "chat") return;
    // Keep the latest message visible without scrolling the entire page.
    if (!chatStickToBottomRef.current) return;
    const el = chatScrollRef.current;
    if (!el) return;
    // Wait for DOM layout (new message) before scrolling.
    window.requestAnimationFrame(() => {
      try {
        el.scrollTop = el.scrollHeight;
      } catch {
        // ignore
      }
    });
  }, [mode, chatMessages.length, chatLoading]);

  useEffect(() => {
    setChatMessages((prev) => {
      if (prev.length !== 1) return prev;
      const only = prev[0];
      if (!only || only.id !== "m0" || only.role !== "assistant") return prev;
      if (only.suggestions && only.suggestions.length > 0) return prev;

      const nextText = l(
        "我可以像 Gemini 一样跟你多轮聊天规划行程。告诉我：城市、天数、偏好、必去点、预算/交通方式。",
        "I can plan your trip in a multi-turn chat. Tell me: city, days, preferences, must-sees, budget/transport.",
      );
      if (only.text === nextText) return prev;
      return [{ ...only, text: nextText }];
    });
  }, [locale, l]);

  useEffect(() => {
    return () => {
      if (chatClearTimerRef.current) {
        window.clearTimeout(chatClearTimerRef.current);
        chatClearTimerRef.current = null;
      }
    };
  }, []);

  const resetChat = () => {
    setChatMessages([
      {
        id: "m0",
        role: "assistant",
        text: l(
          "我可以像 Gemini 一样跟你多轮聊天规划行程。告诉我：城市、天数、偏好、必去点、预算/交通方式。",
          "I can plan your trip in a multi-turn chat. Tell me: city, days, preferences, must-sees, budget/transport.",
        ),
        ts: Date.now(),
      },
    ]);
    setChatDraft("");
    setChatError(null);
    setChatPicked({});
    setChatClearArmed(false);
    if (chatClearTimerRef.current) {
      window.clearTimeout(chatClearTimerRef.current);
      chatClearTimerRef.current = null;
    }
    chatStickToBottomRef.current = true;
  };

  const onClearClick = () => {
    if (!chatClearArmed) {
      setChatClearArmed(true);
      if (chatClearTimerRef.current) {
        window.clearTimeout(chatClearTimerRef.current);
      }
      chatClearTimerRef.current = window.setTimeout(() => {
        setChatClearArmed(false);
        chatClearTimerRef.current = null;
      }, 2500);
      return;
    }
    resetChat();
  };

  const canChatSend = useMemo(() => {
    return chatDraft.trim().length > 0 && !chatLoading;
  }, [chatDraft, chatLoading]);

  const buildIntentHintsFromLatestUserText = (text: string): string => {
    const s = (text || "").trim();
    if (!s) return "";

    // Heuristic for common ambiguity:
    // “日本五一/黄金周期间去甲米” -> Japan Golden Week is a time window, destination is after 去/到.
    const hasJapanGoldenWeek =
      s.includes("日本五一") ||
      s.includes("日本的五一") ||
      s.includes("日本黄金周");
    const goMatch = s.match(/(?:去|到)\s*([\p{Script=Han}A-Za-z·\-]+)\s*$/u);
    const dest = (goMatch?.[1] || "").trim();

    if (hasJapanGoldenWeek && dest && !dest.includes("日本")) {
      return (
        "- 重要：用户提到“日本五一/日本黄金周”是在说时间窗口（日本黄金周），不是目的地。\n" +
        `- 目的地应是：${dest}。若仍不确定，请先用 1 句反问确认目的地与出发地。`
      );
    }

    return "";
  };

  const formatChatPrompt = (messages: ChatMessage[]) => {
    // Keep context bounded so the prompt doesn't grow without limit.
    const MAX_TURNS = 16;
    const recent = messages
      .filter((m) => m.text && m.text.trim())
      .slice(-MAX_TURNS);

    const transcript = recent
      .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.text}`)
      .join("\n\n");

    const latestUser = [...recent].reverse().find((m) => m.role === "user");
    const intentHints = latestUser
      ? buildIntentHintsFromLatestUserText(latestUser.text)
      : "";

    return (
      "Conversation:\n" +
      transcript +
      (intentHints ? `\n\nIntent hints:\n${intentHints}\n` : "\n\n") +
      "\n\nRules:\n" +
      `- Reply in concise ${chatOutputLanguage}. Do not switch languages unless the user explicitly asks.\n` +
      "- Do not output JSON, code blocks, or markdown fences.\n" +
      "- Avoid repetitive confirmations. Do NOT restate the same known details (e.g., city/days/preferences) in every reply.\n" +
      "- If you acknowledge, acknowledge only NEW info in <= 1 short sentence, then ask the next question or provide the next step.\n" +
      "- If you need more info, ask 1-2 clarifying questions.\n" +
      "- If a message mentions Japan Golden Week (日本五一/黄金周/Golden Week) and also says 去/到某地, treat Japan Golden Week as a time window, and the destination as the place after 去/到.\n" +
      "- If multiple locations are mentioned and destination is ambiguous, ask a confirmation question before assuming.\n"
    );
  };

  const isGeminiItineraryPlaceLike = (v: any): v is GeminiItineraryPlace => {
    if (!v || typeof v !== "object") return false;
    if (typeof v.label !== "string" || v.label.trim().length === 0)
      return false;
    if (typeof v.query !== "string" || v.query.trim().length === 0)
      return false;
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

  const clampDurationMinutes = (n: unknown): number => {
    const v = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(v)) return 90;
    return Math.max(30, Math.min(240, Math.round(v)));
  };

  const extractPlaceSuggestions = async (
    messages: ChatMessage[],
  ): Promise<GeminiItineraryPlace[]> => {
    const MAX_TURNS = 20;
    const recent = messages
      .filter((m) => m.text && m.text.trim())
      .slice(-MAX_TURNS);

    const transcript = recent
      .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.text}`)
      .join("\n\n");

    const categoryRule =
      locale === "zh"
        ? "- category must be one of: 历史古迹, 地标建筑, 博物馆, 美术馆, 自然风景, 公园, 街区/步行街, 美食, 购物, 夜景, 休闲\n"
        : "- category must be one of: Historic site, Landmark, Museum, Art gallery, Nature, Park, Street / walk, Food, Shopping, Night view, Relaxation\n";

    const reasonRule =
      locale === "zh"
        ? "- reason: a short recommendation reason (<= 15 Chinese characters), user-friendly.\n"
        : locale === "ja"
          ? "- reason: a short recommendation reason (<= 20 Japanese characters), user-friendly.\n"
          : "- reason: a short recommendation reason (<= 15 words), user-friendly.\n";

    const res = await callGemini({
      systemPrompt: "You extract POI suggestions. Output ONLY valid JSON.",
      userPrompt:
        "From the conversation, extract up to 6 suggested attractions/POIs the user might add as destinations.\n" +
        "Return ONLY JSON with this schema:\n" +
        "{ suggestions: [ { label: string, query: string, category: string, durationMinutes: number, timeSlot?: string, notes?: string, reason?: string } ] }\n" +
        "Rules:\n" +
        "- query should be a Google Places text query, include city keywords if needed.\n" +
        categoryRule +
        "- durationMinutes must be 30-240\n" +
        reasonRule +
        "- If none, return { suggestions: [] }\n\n" +
        `CONVERSATION:\n${transcript}`,
      temperature: 0.2,
    });

    const arr = Array.isArray((res as any)?.suggestions)
      ? ((res as any).suggestions as any[])
      : [];

    const out: GeminiItineraryPlace[] = [];
    const seen = new Set<string>();
    for (const it of arr) {
      if (!it || typeof it !== "object") continue;
      const normalized = {
        label: String((it as any).label || "").trim(),
        query: String((it as any).query || "").trim(),
        category: String((it as any).category || "").trim(),
        durationMinutes: clampDurationMinutes((it as any).durationMinutes),
        timeSlot:
          (it as any).timeSlot != null
            ? String((it as any).timeSlot).trim()
            : undefined,
        notes:
          (it as any).notes != null
            ? String((it as any).notes).trim()
            : undefined,
        reason:
          (it as any).reason != null
            ? String((it as any).reason).trim()
            : undefined,
      };
      const key = normalized.query.toLowerCase();
      if (!normalized.query || seen.has(key)) continue;
      if (!isGeminiItineraryPlaceLike(normalized)) continue;
      seen.add(key);
      out.push(normalized);
      if (out.length >= 6) break;
    }

    return out;
  };

  const sendChat = async () => {
    const text = chatDraft.trim();
    if (!text || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      text,
      ts: Date.now(),
    };

    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setChatDraft("");
    setChatLoading(true);
    setChatError(null);

    try {
      const res = await callGemini({
        systemPrompt: `You are a helpful travel planning assistant. Reply in concise ${chatOutputLanguage}. Avoid JSON and code blocks. Do not switch languages unless the user explicitly asks. Avoid repetitive confirmations or re-summarizing unchanged details every turn; acknowledge only new info briefly, then move on. If the user corrects you, acknowledge and immediately fix your understanding.`,
        userPrompt: formatChatPrompt(nextMessages),
        temperature: 0.6,
      });

      const assistantText =
        typeof res === "string"
          ? res
          : typeof (res as any)?.rawText === "string"
            ? String((res as any).rawText)
            : (() => {
                try {
                  return JSON.stringify(res);
                } catch {
                  return l(
                    "（生成结果无法解析）",
                    "(Failed to parse generated result)",
                  );
                }
              })();

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: "assistant",
        text: (assistantText || "").trim() || l("（无内容）", "(No content)"),
        ts: Date.now(),
      };

      const withAssistant = [...nextMessages, assistantMsg];
      setChatMessages(withAssistant);

      // Best-effort: extract clickable POI suggestions from the conversation.
      try {
        const suggestions = await extractPlaceSuggestions(withAssistant);
        if (suggestions.length > 0) {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, suggestions } : m,
            ),
          );
        }
      } catch {
        // Ignore extraction failures to keep chat UX clean.
      }
    } catch (e: any) {
      setChatError(
        e?.message ||
          l(
            "对话失败，请检查 Gemini Key 或网络。\n",
            "Chat failed. Please check your Gemini key or network.\n",
          ),
      );
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-[#1e293b] rounded-lg shadow-lg p-3 ring-1 ring-black/5 dark:ring-white/10 ${
        className || ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 text-primary shrink-0">
          <Icon name="assistant" className="text-[20px]" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              {mode === "chat"
                ? l("旅行助手（多轮对话）", "Trip assistant (chat)")
                : l(
                    "行程内容 → 可执行计划（可点击添加）",
                    "Trip text → actionable plan (click to add)",
                  )}
            </p>
            {mode === "plan" ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {l(
                  "直接粘贴你的行程想法：城市/天数/偏好/必去点。例：\n“2天罗马，喜欢博物馆和建筑，晚上想看夜景”",
                  'Paste your trip idea: city/days/preferences/must-sees. Example:\n"2 days in Rome, I like museums and architecture, and want night views"',
                )}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setMode("chat")}
              className={`px-2 py-1 rounded-md text-xs font-extrabold transition-colors ${
                mode === "chat"
                  ? "bg-primary text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600"
              }`}
              title={l("多轮对话", "Chat")}
            >
              {l("对话", "Chat")}
            </button>
            <button
              type="button"
              onClick={() => setMode("plan")}
              className={`px-2 py-1 rounded-md text-xs font-extrabold transition-colors ${
                mode === "plan"
                  ? "bg-primary text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600"
              }`}
              title={l("从文本生成可执行计划", "Generate a plan from text")}
            >
              {l("计划", "Plan")}
            </button>

            {mode === "chat" ? (
              <button
                type="button"
                onClick={onClearClick}
                className={`px-2 py-1 rounded-md text-xs font-extrabold transition-colors flex items-center gap-1 ring-1 ring-black/5 dark:ring-white/10 ${
                  chatClearArmed
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-white/70 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/60 text-slate-900 dark:text-white"
                }`}
                title={
                  chatClearArmed
                    ? l("再次点击确认清空", "Click again to confirm")
                    : l(
                        "清空对话（需要确认）",
                        "Clear chat (confirmation required)",
                      )
                }
              >
                <Icon name="delete" className="text-[16px]" />
                {chatClearArmed ? l("确认", "Confirm") : l("清空", "Clear")}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {mode === "chat" ? (
        <div className="mt-2">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 ring-1 ring-black/5 dark:ring-white/10 p-3">
            <div
              ref={chatScrollRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                const remaining =
                  el.scrollHeight - el.scrollTop - el.clientHeight;
                chatStickToBottomRef.current = remaining < 80;
              }}
              className="max-h-[45dvh] sm:max-h-[320px] overflow-auto overscroll-contain pr-1 space-y-2"
            >
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ring-1 ring-black/5 dark:ring-white/10 ${
                      m.role === "user"
                        ? "bg-primary text-white"
                        : "bg-white dark:bg-slate-900/40 text-slate-900 dark:text-white"
                    }`}
                  >
                    {m.text}
                  </div>

                  {m.role === "assistant" &&
                  Array.isArray(m.suggestions) &&
                  m.suggestions.length > 0 ? (
                    <div className="mt-2 w-full max-w-[85%] grid grid-cols-1 gap-2">
                      {m.suggestions.map((p) => {
                        const key = p.query.trim().toLowerCase();
                        const disabled = Boolean(chatPicked[key]);
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              setChatPicked((prev) => ({
                                ...prev,
                                [key]: true,
                              }));
                              onPickPlace({ ...p, day: 1 });
                            }}
                            className={`w-full text-left rounded-lg px-3 py-2 transition-colors ring-1 ring-black/5 dark:ring-white/10 ${
                              disabled
                                ? "bg-slate-200/70 dark:bg-slate-700/60 opacity-70 cursor-not-allowed"
                                : "bg-white dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/70"
                            }`}
                            title={p.notes ? p.notes : p.query}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                                    {p.label}
                                  </span>
                                  {p.timeSlot ? (
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                      {p.timeSlot}
                                    </span>
                                  ) : null}
                                  <span
                                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${categoryColor(
                                      p.category,
                                    )}`}
                                  >
                                    {formatCategoryLabel(p.category, l)}
                                  </span>
                                  {p.durationMinutes ? (
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                      {l("建议停留：", "Suggested: ")}
                                      {formatDuration(
                                        p.durationMinutes,
                                        locale,
                                      )}
                                    </span>
                                  ) : null}
                                </div>
                                {p.reason ? (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {l("推荐理由：", "Why: ")}
                                    {p.reason}
                                  </p>
                                ) : p.notes ? (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                    {p.notes}
                                  </p>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs font-extrabold text-primary">
                                  {disabled
                                    ? l("已添加", "Added")
                                    : l("添加", "Add")}
                                </span>
                                <Icon
                                  name={disabled ? "check" : "add"}
                                  className="text-[18px]"
                                />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ))}
              {chatLoading ? (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-white dark:bg-slate-900/40 text-slate-900 dark:text-white ring-1 ring-black/5 dark:ring-white/10">
                    {l("正在思考…", "Thinking...")}
                  </div>
                </div>
              ) : null}
              <div ref={chatBottomRef} />
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-end gap-2">
                <textarea
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  onKeyDown={(e) => {
                    // Desktop: Enter sends, Shift+Enter adds newline.
                    // Mobile: keep Enter as newline; use the Send button.
                    if (!isSmallScreen && e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendChat();
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900/40 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary min-h-[44px] max-h-[140px] resize-none ring-1 ring-black/5 dark:ring-white/10"
                  placeholder={l("输入消息…", "Type a message...")}
                  enterKeyHint={isSmallScreen ? "enter" : "send"}
                />

                <button
                  type="button"
                  disabled={!canChatSend}
                  onClick={() => void sendChat()}
                  className="h-[44px] px-4 rounded-lg bg-primary text-white font-extrabold text-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  title={l("发送", "Send")}
                >
                  {l("发送", "Send")}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={
                      !canVoice || (isRecording && recordingTarget === "plan")
                    }
                    onPointerDown={(e) => beginHoldToTalk(e, "chat")}
                    onPointerUp={(e) => endHoldToTalk(e, "chat")}
                    onPointerCancel={() => cancelHoldToTalk("chat")}
                    onLostPointerCapture={() => cancelHoldToTalk("chat")}
                    onContextMenu={(e) => e.preventDefault()}
                    draggable={false}
                    onKeyDown={(e) => {
                      if (e.repeat) return;
                      if (e.key !== " " && e.key !== "Enter") return;
                      holdToTalkActiveRef.current = true;
                      e.preventDefault();
                      void startRecording("chat");
                    }}
                    onKeyUp={(e) => {
                      if (e.key !== " " && e.key !== "Enter") return;
                      holdToTalkActiveRef.current = false;
                      e.preventDefault();
                      if (isRecording && recordingTarget === "chat")
                        stopRecording();
                    }}
                    style={{
                      WebkitTouchCallout: "none",
                      WebkitUserSelect: "none",
                      userSelect: "none",
                      touchAction: "none",
                    }}
                    className={`flex-1 sm:flex-none px-3 py-2 rounded-lg font-extrabold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${
                      isRecording && recordingTarget === "chat"
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
                    } select-none touch-none`}
                    title={
                      isRecording && recordingTarget === "chat"
                        ? l("松开结束", "Release to stop")
                        : l(
                            "按住说话（Gemini 语音识别）",
                            "Hold to talk (Gemini speech-to-text)",
                          )
                    }
                  >
                    <Icon
                      name={
                        isRecording && recordingTarget === "chat"
                          ? "stop"
                          : "mic"
                      }
                      className="text-[18px]"
                    />
                    {isRecording && recordingTarget === "chat"
                      ? l("松开结束", "Release")
                      : voiceLoading
                        ? l("识别中", "Transcribing")
                        : l("按住说话", "Hold")}
                  </button>

                  <select
                    value={voiceLang}
                    onChange={(e) =>
                      setVoiceLang(e.target.value as typeof voiceLang)
                    }
                    className="px-2 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary text-xs font-bold"
                    title={l(
                      "语音识别输出语言（auto 表示保持原语言）",
                      "Speech-to-text output language (auto keeps original)",
                    )}
                    disabled={isRecording || voiceLoading}
                  >
                    <option value="auto">
                      {l("语音：自动", "Voice: Auto")}
                    </option>
                    <option value="zh">{l("中文", "Chinese")}</option>
                    <option value="en">English</option>
                    <option value="ja">日本語</option>
                    <option value="ko">한국어</option>
                    <option value="fr">Français</option>
                    <option value="es">Español</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>

                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 self-end sm:self-auto">
                  <span className="hidden sm:inline">
                    {l(
                      "Enter 发送 · Shift+Enter 换行",
                      "Enter to send · Shift+Enter for newline",
                    )}
                  </span>
                  <span className="sm:hidden">
                    {l("点发送按钮发送", "Tap Send to send")}
                  </span>
                </div>
              </div>

              <div
                className="text-[11px] font-bold text-slate-500 dark:text-slate-400"
                aria-live="polite"
              >
                {voiceLoading
                  ? l("正在识别…", "Transcribing...")
                  : isRecording && recordingTarget === "chat"
                    ? l("正在聆听…松开结束", "Listening... release to stop")
                    : l(
                        "按住说话，松开自动识别",
                        "Hold to talk, release to transcribe",
                      )}
              </div>
            </div>
          </div>

          {chatError ? (
            <div className="mt-2 text-xs text-rose-600 dark:text-rose-200 font-semibold">
              {chatError}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <textarea
              value={itineraryText}
              onChange={(e) => setItineraryText(e.target.value)}
              className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary min-h-[160px] sm:min-h-[96px] resize-y"
              placeholder={l(
                "输入/粘贴你的行程内容…",
                "Type/paste your trip notes...",
              )}
            />
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={voiceLang}
                  onChange={(e) =>
                    setVoiceLang(e.target.value as typeof voiceLang)
                  }
                  className="w-full sm:w-auto px-2 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                  title={l(
                    "语音识别输出语言（auto 表示保持原语言）",
                    "Speech-to-text output language (auto keeps original)",
                  )}
                  disabled={isRecording || voiceLoading}
                >
                  <option value="auto">
                    {l("语音语言：自动", "Voice language: Auto")}
                  </option>
                  <option value="zh">{l("中文", "Chinese")}</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                  <option value="de">Deutsch</option>
                </select>

                <button
                  type="button"
                  disabled={
                    !canVoice || (isRecording && recordingTarget === "chat")
                  }
                  onPointerDown={(e) => beginHoldToTalk(e, "plan")}
                  onPointerUp={(e) => endHoldToTalk(e, "plan")}
                  onPointerCancel={() => cancelHoldToTalk("plan")}
                  onLostPointerCapture={() => cancelHoldToTalk("plan")}
                  onContextMenu={(e) => e.preventDefault()}
                  draggable={false}
                  onKeyDown={(e) => {
                    if (e.repeat) return;
                    if (e.key !== " " && e.key !== "Enter") return;
                    holdToTalkActiveRef.current = true;
                    e.preventDefault();
                    void startRecording("plan");
                  }}
                  onKeyUp={(e) => {
                    if (e.key !== " " && e.key !== "Enter") return;
                    holdToTalkActiveRef.current = false;
                    e.preventDefault();
                    if (isRecording && recordingTarget === "plan")
                      stopRecording();
                  }}
                  style={{
                    WebkitTouchCallout: "none",
                    WebkitUserSelect: "none",
                    userSelect: "none",
                    touchAction: "none",
                  }}
                  className={`w-full sm:w-auto px-3 py-2 rounded-lg font-extrabold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${
                    isRecording && recordingTarget === "plan"
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
                  } select-none touch-none`}
                  title={
                    isRecording && recordingTarget === "plan"
                      ? l("松开结束", "Release to stop")
                      : l(
                          "按住说话（Gemini 语音识别）",
                          "Hold to talk (Gemini speech-to-text)",
                        )
                  }
                >
                  <Icon
                    name={
                      isRecording && recordingTarget === "plan" ? "stop" : "mic"
                    }
                    className="text-[18px]"
                  />
                  {isRecording && recordingTarget === "plan"
                    ? l("松开结束", "Release")
                    : voiceLoading
                      ? l("识别中", "Transcribing")
                      : l("按住说话", "Hold")}
                </button>
              </div>

              <div
                className="text-[11px] font-bold text-slate-500 dark:text-slate-400"
                aria-live="polite"
              >
                {voiceLoading
                  ? l("正在识别…", "Transcribing...")
                  : isRecording && recordingTarget === "plan"
                    ? l("正在聆听…松开结束", "Listening... release to stop")
                    : l(
                        "按住说话，松开自动识别",
                        "Hold to talk, release to transcribe",
                      )}
              </div>

              <button
                type="button"
                disabled={!canSubmit}
                onClick={run}
                className="w-full px-3 py-2 rounded-lg bg-primary text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={l("生成行程计划", "Generate itinerary plan")}
              >
                {loading
                  ? l("生成中", "Generating")
                  : l("生成计划", "Generate plan")}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-2 text-xs text-rose-600 dark:text-rose-200 font-semibold">
              {error}
            </div>
          )}

          {plan?.days?.length ? (
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {l(
                    "计划结果（点击景点 → 自动加入下面目的地）",
                    "Plan results (click a place → adds to your destinations)",
                  )}
                </p>
                <div className="flex items-center gap-3">
                  {plan.cityHint && (
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {l("城市：", "City: ")}
                      {plan.cityHint}
                    </span>
                  )}
                  {Object.keys(picked).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPicked({})}
                      className="text-[11px] font-extrabold text-primary hover:underline"
                      title={l(
                        "清除已添加标记，以便重新点击添加",
                        "Clear added markers so you can add again",
                      )}
                    >
                      {l("重置已添加", "Reset added")}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-3">
                {plan.days.map((d) => (
                  <div
                    key={d.day}
                    className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-3 ring-1 ring-black/5 dark:ring-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {l(`第 ${d.day} 天`, `Day ${d.day}`)}
                        {d.title ? ` · ${d.title}` : ""}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        {l(
                          `${d.items.length} 个景点`,
                          `${d.items.length} spots`,
                        )}
                      </p>
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-2">
                      {d.items.map((p) => {
                        const key = p.query.trim().toLowerCase();
                        const disabled = Boolean(picked[key]);

                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              setPicked((prev) => ({ ...prev, [key]: true }));
                              onPickPlace({ ...p, day: d.day });
                            }}
                            className={`w-full text-left rounded-lg px-3 py-2 transition-colors ring-1 ring-black/5 dark:ring-white/10 ${
                              disabled
                                ? "bg-slate-200/70 dark:bg-slate-700/60 opacity-70 cursor-not-allowed"
                                : "bg-white dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/70"
                            }`}
                            title={p.notes ? p.notes : p.query}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                                    {p.label}
                                  </span>
                                  {p.timeSlot && (
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                      {p.timeSlot}
                                    </span>
                                  )}
                                  <span
                                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${categoryColor(
                                      p.category,
                                    )}`}
                                  >
                                    {formatCategoryLabel(p.category, l)}
                                  </span>
                                  {p.durationMinutes ? (
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                      {l("建议停留：", "Suggested: ")}
                                      {formatDuration(
                                        p.durationMinutes,
                                        locale,
                                      )}
                                    </span>
                                  ) : null}
                                </div>
                                {p.notes ? (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                    {p.notes}
                                  </p>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs font-extrabold text-primary">
                                  {disabled
                                    ? l("已添加", "Added")
                                    : l("添加", "Add")}
                                </span>
                                <Icon
                                  name={disabled ? "check" : "add"}
                                  className="text-[18px]"
                                />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
