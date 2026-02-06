type GeminiContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiCallInput = {
  systemPrompt: string;
  userPrompt: string;
  /**
   * Optional extra content parts appended after the system/user text.
   * Use for multimodal inputs such as audio (inlineData).
   */
  parts?: GeminiContentPart[];
  model?: string;
  temperature?: number;
};

declare const __GEMINI_API_KEY__: string | undefined;

type GeminiApiVersion = "v1beta" | "v1";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

const getEnv = (key: string): string | undefined => {
  try {
    // In Node (tests/SSR), prefer process.env so callers can override deterministically.
    const fromProcess =
      typeof process !== "undefined" ? (process as any)?.env?.[key] : undefined;
    if (typeof fromProcess === "string") return fromProcess;

    // Vite exposes env vars on import.meta.env
    return (import.meta as any)?.env?.[key];
  } catch {
    return undefined;
  }
};

const extractTextFromResponse = (json: any): string => {
  const parts =
    json?.candidates?.[0]?.content?.parts ?? json?.candidates?.[0]?.content;

  if (Array.isArray(parts)) {
    const texts = parts
      .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
      .filter(Boolean);
    return texts.join("\n").trim();
  }

  // Fallback: some APIs return outputText.
  if (typeof json?.outputText === "string") return json.outputText.trim();

  return "";
};

const extractFirstJsonObject = (text: string): unknown => {
  const s = String(text || "");
  const firstBrace = s.indexOf("{");
  const firstBracket = s.indexOf("[");

  const start =
    firstBrace === -1
      ? firstBracket
      : firstBracket === -1
        ? firstBrace
        : Math.min(firstBrace, firstBracket);

  if (start === -1) return undefined;

  // Try a cheap balanced-brackets scan.
  const stack: string[] = [];
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{" || ch === "[") stack.push(ch);
    if (ch === "}" || ch === "]") stack.pop();
    if (stack.length === 0) {
      const candidate = s.slice(start, i + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
};

const parseGeminiErrorMessage = (raw: string): string => {
  const s = (raw || "").trim();
  if (!s) return "";
  try {
    const j = JSON.parse(s);
    const msg = j?.error?.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  } catch {
    // ignore
  }
  return s;
};

const shouldUseProxy = (): boolean => {
  try {
    const v = String(getEnv("VITE_GEMINI_USE_PROXY") || "")
      .trim()
      .toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  } catch {
    return false;
  }
};

const callGeminiViaProxy = async (input: GeminiCallInput): Promise<unknown> => {
  const url = String(getEnv("VITE_GEMINI_PROXY_URL") || "/api/gemini").trim();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemPrompt: input.systemPrompt || "",
      userPrompt: input.userPrompt || "",
      parts: input.parts,
      model: input.model,
      temperature: input.temperature,
      apiVersion: getEnv("VITE_GEMINI_API_VERSION") || "v1",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const msg = parseGeminiErrorMessage(errText) || res.statusText;
    const err = new Error(`Gemini proxy failed (${res.status}): ${msg}`);
    (err as any).status = res.status;
    (err as any).messageRaw = errText;
    throw err;
  }

  const json = await res.json().catch(() => ({}));
  const text = extractTextFromResponse(json);
  const parsed = extractFirstJsonObject(text);
  return parsed ?? { rawText: text, rawResponse: json };
};

const fetchGemini = async (
  url: string,
  apiKey: string,
  init: RequestInit,
): Promise<Response> => {
  // Prefer header-based API key so it doesn't appear in URLs/network logs.
  const headers: Record<string, string> = {
    "x-goog-api-key": apiKey,
    ...(init.headers as any),
  };

  const res = await fetch(url, { ...init, headers });
  if (res.status !== 401 && res.status !== 403) return res;

  // Fallback for environments where x-goog-api-key isn't accepted.
  const urlWithKey = `${url}${url.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`;
  return fetch(urlWithKey, init);
};

const normalizeModelId = (name: string): string => {
  const s = (name || "").trim();
  if (!s) return "";
  const parts = s.split("/");
  return parts[parts.length - 1] || s;
};

type GeminiModelInfo = {
  name: string;
  supportedGenerationMethods?: string[];
};

// Cache best-effort chosen model per apiKey + preferred version.
const modelCache = new Map<
  string,
  { version: GeminiApiVersion; modelId: string }
>();

const listModels = async (
  apiKey: string,
  version: GeminiApiVersion,
): Promise<GeminiModelInfo[]> => {
  const url = `${GEMINI_BASE_URL}/${version}/models`;
  const res = await fetchGemini(url, apiKey, { method: "GET" });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return Array.isArray((json as any)?.models) ? (json as any).models : [];
};

const pickModel = (
  models: GeminiModelInfo[],
  desiredId: string,
): string | undefined => {
  const desired = normalizeModelId(desiredId).toLowerCase();
  const candidates = models.filter((m) =>
    (m?.supportedGenerationMethods ?? []).includes("generateContent"),
  );
  if (candidates.length === 0) return undefined;

  const exact = candidates.find(
    (m) => normalizeModelId(m.name).toLowerCase() === desired,
  );
  if (exact) return normalizeModelId(exact.name);

  // Prefer same family (e.g. desired gemini-3.* -> pick any gemini-3* first).
  const family = desired.match(/^gemini-\d+/i)?.[0];
  if (family) {
    const familyCandidates = candidates.filter((m) =>
      normalizeModelId(m.name).toLowerCase().startsWith(family),
    );
    const familyFlash = familyCandidates.find((m) =>
      normalizeModelId(m.name).toLowerCase().includes("flash"),
    );
    if (familyFlash) return normalizeModelId(familyFlash.name);
    if (familyCandidates.length > 0)
      return normalizeModelId(familyCandidates[0].name);
  }

  const flash = candidates.find((m) =>
    normalizeModelId(m.name).toLowerCase().includes("flash"),
  );
  if (flash) return normalizeModelId(flash.name);

  return normalizeModelId(candidates[0].name);
};

const callGenerateContent = async (input: {
  apiKey: string;
  apiVersion: GeminiApiVersion;
  modelId: string;
  systemPrompt: string;
  userPrompt: string;
  extraParts?: GeminiContentPart[];
  temperature: number;
}): Promise<unknown> => {
  const shouldDebug =
    Boolean((import.meta as any)?.env?.DEV) ||
    String(getEnv("VITE_GEMINI_DEBUG") || "").toLowerCase() === "true";
  if (shouldDebug) {
    // eslint-disable-next-line no-console
    console.info(`[Gemini] ${input.apiVersion} ${input.modelId}`);
  }

  const url = `${GEMINI_BASE_URL}/${input.apiVersion}/models/${encodeURIComponent(
    input.modelId,
  )}:generateContent`;

  // Optional: force a response mime type (some accounts/models reject this with 400).
  const configuredResponseMimeType = (
    getEnv("VITE_GEMINI_RESPONSE_MIME_TYPE") || ""
  ).trim();

  const buildBody = (withResponseMimeType: boolean) => {
    const generationConfig: any = {
      temperature: input.temperature,
    };
    if (withResponseMimeType && configuredResponseMimeType) {
      generationConfig.responseMimeType = configuredResponseMimeType;
    }

    const baseText = `SYSTEM:\n${input.systemPrompt}\n\nUSER:\n${input.userPrompt}`;
    const parts: GeminiContentPart[] = [{ text: baseText }];
    if (Array.isArray(input.extraParts) && input.extraParts.length > 0) {
      parts.push(...input.extraParts);
    }

    return {
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig,
    };
  };

  const doRequest = async (withResponseMimeType: boolean) =>
    fetchGemini(url, input.apiKey, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildBody(withResponseMimeType)),
    });

  // Default: don't force responseMimeType (maximum compatibility).
  let res = await doRequest(false);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const msg = parseGeminiErrorMessage(errText) || res.statusText;

    // If user explicitly configured responseMimeType and the API rejects it, retry without.
    if (
      configuredResponseMimeType &&
      res.status === 400 &&
      (msg.toLowerCase().includes("responsemimetype") ||
        msg.toLowerCase().includes("response_mime_type"))
    ) {
      res = await doRequest(false);
      if (res.ok) {
        const json = await res.json();
        const text = extractTextFromResponse(json);
        const parsed = extractFirstJsonObject(text);
        return parsed ?? { rawText: text, rawResponse: json };
      }
    }

    // Also support the opposite: if we *didn't* send responseMimeType but the model requires it,
    // allow retrying once when user configured it.
    if (configuredResponseMimeType && res.status === 400) {
      res = await doRequest(true);
      if (res.ok) {
        const json = await res.json();
        const text = extractTextFromResponse(json);
        const parsed = extractFirstJsonObject(text);
        return parsed ?? { rawText: text, rawResponse: json };
      }
    }

    const err = new Error(`Gemini call failed (${res.status}): ${msg}`);
    (err as any).status = res.status;
    (err as any).messageRaw = errText;
    throw err;
  }

  const json = await res.json();
  const text = extractTextFromResponse(json);
  const parsed = extractFirstJsonObject(text);
  return parsed ?? { rawText: text, rawResponse: json };
};

export async function callGemini(input: unknown): Promise<unknown> {
  const {
    systemPrompt = "",
    userPrompt = "",
    model,
    temperature,
    parts,
  } = (input as GeminiCallInput) ?? ({} as GeminiCallInput);

  const apiKey = (
    getEnv("VITE_GEMINI_API_KEY") ||
    // Fallback for setups where import.meta.env isn't populated (e.g. some hosted sandboxes).
    (typeof __GEMINI_API_KEY__ === "string" ? __GEMINI_API_KEY__ : "") ||
    // Back-compat with upstream templates.
    getEnv("GEMINI_API_KEY") ||
    (process as any)?.env?.GEMINI_API_KEY ||
    getEnv("API_KEY") ||
    (process as any)?.env?.API_KEY ||
    ""
  ).trim();
  const proxyPreferred = shouldUseProxy();
  if (!apiKey || proxyPreferred) {
    // Safe-by-default for production: if no client key is present, use a server-side proxy.
    // Local dev can still set VITE_GEMINI_API_KEY to call Gemini directly.
    return callGeminiViaProxy({
      systemPrompt,
      userPrompt,
      model,
      temperature,
      parts,
    });
  }

  // Keep model configurable. If you have Gemini 3 access, set VITE_GEMINI_MODEL to e.g. "gemini-3.0-flash".
  const configuredModel = (model || getEnv("VITE_GEMINI_MODEL") || "").trim();
  const isModelPinned = Boolean(configuredModel);

  const resolvedTemp = typeof temperature === "number" ? temperature : 0.2;
  // Prefer stable v1 by default (v1beta frequently drops/renames models).
  const preferredVersion = (
    (getEnv("VITE_GEMINI_API_VERSION") as GeminiApiVersion) || "v1"
  ).trim() as GeminiApiVersion;

  const tryVersions: GeminiApiVersion[] =
    preferredVersion === "v1" ? ["v1", "v1beta"] : ["v1beta", "v1"];

  const cacheKey = `${apiKey}::${preferredVersion}`;

  // If user didn't configure a model, discover one once to avoid an initial 404 spam.
  if (!configuredModel) {
    const cached = modelCache.get(cacheKey);
    if (cached) {
      try {
        return await callGenerateContent({
          apiKey,
          apiVersion: cached.version,
          modelId: cached.modelId,
          systemPrompt,
          userPrompt,
          extraParts: parts,
          temperature: resolvedTemp,
        });
      } catch {
        modelCache.delete(cacheKey);
      }
    }

    for (const v of tryVersions) {
      const models = await listModels(apiKey, v);
      const picked = pickModel(models, "gemini-3.0-flash");
      if (!picked) continue;
      try {
        const result = await callGenerateContent({
          apiKey,
          apiVersion: v,
          modelId: picked,
          systemPrompt,
          userPrompt,
          extraParts: parts,
          temperature: resolvedTemp,
        });
        modelCache.set(cacheKey, { version: v, modelId: picked });
        return result;
      } catch {
        // try next version/model
      }
    }
    // Fall through to the normal error-handling path below.
  }

  // Default to Gemini 3 Flash for interactive UX; the fallback logic will auto-pick another model if unavailable.
  const resolvedModel = configuredModel || "gemini-3.0-flash";

  // First attempt: user-configured model/version (or fallback default).
  try {
    return await callGenerateContent({
      apiKey,
      apiVersion: tryVersions[0],
      modelId: resolvedModel,
      systemPrompt,
      userPrompt,
      extraParts: parts,
      temperature: resolvedTemp,
    });
  } catch (e: any) {
    const status = Number(e?.status ?? 0);
    const msg = String(e?.message ?? "");
    const isModelNotFound =
      status === 404 &&
      (msg.toLowerCase().includes("call listmodels") ||
        msg.toLowerCase().includes("not found for api version") ||
        msg.toLowerCase().includes("not supported for generatecontent"));

    if (!isModelNotFound) throw e;

    // If the user explicitly pinned a model (via env or input), do NOT auto-fallback.
    // Surface the error so they can adjust VITE_GEMINI_MODEL.
    if (isModelPinned) {
      throw new Error(
        `${msg}\nPinned model is not available: ${resolvedModel}.\nSet VITE_GEMINI_MODEL to an available model (or unset it to enable auto-pick).`,
      );
    }

    // Auto-fallback: list available models for this key and pick a compatible one.
    for (const v of tryVersions) {
      const models = await listModels(apiKey, v);
      const picked = pickModel(models, resolvedModel);
      if (!picked) continue;
      try {
        const result = await callGenerateContent({
          apiKey,
          apiVersion: v,
          modelId: picked,
          systemPrompt,
          userPrompt,
          extraParts: parts,
          temperature: resolvedTemp,
        });
        modelCache.set(cacheKey, { version: v, modelId: picked });
        return result;
      } catch {
        // try next version/model
      }
    }

    throw new Error(
      `${msg}\nNo compatible Gemini model found for this API key. Set VITE_GEMINI_MODEL (and optionally VITE_GEMINI_API_VERSION=v1) to an available model from ListModels.`,
    );
  }
}
