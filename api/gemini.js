const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

const normalizeModelId = (name) => {
  const s = String(name || "").trim();
  if (!s) return "";
  const parts = s.split("/");
  return parts[parts.length - 1] || s;
};

const parseGeminiErrorMessage = (raw) => {
  const s = String(raw || "").trim();
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

const fetchGemini = async (url, apiKey, init) => {
  const headers = {
    "x-goog-api-key": apiKey,
    ...(init?.headers || {}),
  };

  const res = await fetch(url, { ...init, headers });
  return res;
};

const listModels = async (apiKey, apiVersion) => {
  const url = `${GEMINI_BASE_URL}/${apiVersion}/models`;
  const res = await fetchGemini(url, apiKey, { method: "GET" });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json?.models) ? json.models : [];
};

const pickModel = (models, desiredId) => {
  const desired = normalizeModelId(desiredId).toLowerCase();
  const candidates = (models || []).filter((m) =>
    (m?.supportedGenerationMethods ?? []).includes("generateContent"),
  );
  if (candidates.length === 0) return undefined;

  const exact = candidates.find(
    (m) => normalizeModelId(m.name).toLowerCase() === desired,
  );
  if (exact) return normalizeModelId(exact.name);

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

const callGenerateContent = async ({
  apiKey,
  apiVersion,
  modelId,
  systemPrompt,
  userPrompt,
  extraParts,
  temperature,
}) => {
  const url = `${GEMINI_BASE_URL}/${apiVersion}/models/${encodeURIComponent(
    modelId,
  )}:generateContent`;

  const baseText = `SYSTEM:\n${systemPrompt}\n\nUSER:\n${userPrompt}`;
  const parts = [{ text: baseText }];
  if (Array.isArray(extraParts) && extraParts.length > 0)
    parts.push(...extraParts);

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: typeof temperature === "number" ? temperature : 0.2,
    },
  };

  const res = await fetchGemini(url, apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const msg = parseGeminiErrorMessage(errText) || res.statusText;
    const err = new Error(`Gemini call failed (${res.status}): ${msg}`);
    err.status = res.status;
    err.messageRaw = errText;
    throw err;
  }

  return res.json();
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed" } });
    return;
  }

  const apiKey = String(
    process.env.GEMINI_API_KEY || process.env.API_KEY || "",
  ).trim();

  if (!apiKey) {
    res.status(500).json({
      error: {
        message:
          "Missing GEMINI_API_KEY on server. Set it in Vercel Environment Variables (do NOT use VITE_GEMINI_API_KEY for production).",
      },
    });
    return;
  }

  let body = req.body;
  try {
    if (typeof body === "string") body = JSON.parse(body);
  } catch {
    res.status(400).json({ error: { message: "Invalid JSON body" } });
    return;
  }

  const systemPrompt = String(body?.systemPrompt || "");
  const userPrompt = String(body?.userPrompt || "");
  const extraParts = Array.isArray(body?.parts) ? body.parts : undefined;
  const temperature =
    typeof body?.temperature === "number" ? body.temperature : 0.2;
  const requestedModel = String(body?.model || "").trim() || "gemini-3.0-flash";

  const preferredVersion = String(body?.apiVersion || "v1").trim();
  const tryVersions =
    preferredVersion === "v1" ? ["v1", "v1beta"] : ["v1beta", "v1"];

  const isModelPinned = Boolean(String(body?.model || "").trim());

  try {
    // First: try requested model across versions.
    for (const v of tryVersions) {
      try {
        const json = await callGenerateContent({
          apiKey,
          apiVersion: v,
          modelId: requestedModel,
          systemPrompt,
          userPrompt,
          extraParts,
          temperature,
        });
        res.status(200).json(json);
        return;
      } catch (e) {
        const status = Number(e?.status ?? 0);
        if (status !== 404) throw e;
      }
    }

    if (isModelPinned) {
      res.status(404).json({
        error: {
          message: `Pinned model is not available: ${requestedModel}. Remove model pinning or pick an available model in your account.`,
        },
      });
      return;
    }

    // Fallback: list models and pick something compatible.
    for (const v of tryVersions) {
      const models = await listModels(apiKey, v);
      const picked = pickModel(models, requestedModel);
      if (!picked) continue;
      try {
        const json = await callGenerateContent({
          apiKey,
          apiVersion: v,
          modelId: picked,
          systemPrompt,
          userPrompt,
          extraParts,
          temperature,
        });
        res.status(200).json(json);
        return;
      } catch {
        // try next
      }
    }

    res.status(500).json({
      error: {
        message:
          "No compatible Gemini model found for this API key. Verify GEMINI_API_KEY and model access.",
      },
    });
  } catch (e) {
    const msg = String(e?.message || e || "Gemini proxy failed");
    res.status(500).json({ error: { message: msg } });
  }
}
