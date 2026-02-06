import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { callGemini } from "./client";

const jsonResponse = (obj: unknown, init?: ResponseInit) => {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...(init || {}),
  });
};

describe("callGemini (client)", () => {
  const oldEnv = { ...process.env };
  const oldImportMetaEnv = { ...(((import.meta as any).env as any) ?? {}) };

  beforeEach(() => {
    process.env = {
      ...oldEnv,
      GEMINI_API_KEY: "test-key",
      VITE_GEMINI_API_KEY: "test-key",
    };

    // Vitest (via Vite) may populate import.meta.env from local .env files.
    // Force a deterministic key so tests never accidentally use real secrets.
    try {
      (import.meta as any).env = {
        ...oldImportMetaEnv,
        VITE_GEMINI_API_KEY: "test-key",
        VITE_GEMINI_DEBUG: "false",
      };
    } catch {
      try {
        (import.meta as any).env = (import.meta as any).env ?? {};
        (import.meta as any).env.VITE_GEMINI_API_KEY = "test-key";
        (import.meta as any).env.VITE_GEMINI_DEBUG = "false";
      } catch {
        // If import.meta.env is truly immutable in some runtime, process.env still
        // ensures we have a test key for the non-Vite fallbacks.
      }
    }
  });

  afterEach(() => {
    process.env = { ...oldEnv };
    try {
      (import.meta as any).env = { ...oldImportMetaEnv };
    } catch {
      try {
        // Best-effort restore
        for (const k of Object.keys(((import.meta as any).env as any) ?? {})) {
          if (!(k in oldImportMetaEnv)) delete (import.meta as any).env[k];
        }
        for (const [k, v] of Object.entries(oldImportMetaEnv)) {
          (import.meta as any).env[k] = v;
        }
      } catch {
        // ignore
      }
    }
    vi.restoreAllMocks();
  });

  it("sends x-goog-api-key header and parses first JSON object from text", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url: any) => {
        const u = String(url);
        if (u.includes(":generateContent")) {
          return jsonResponse({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Here you go: {"ok":true} thanks' }],
                },
              },
            ],
          });
        }

        // If the client ever calls ListModels in the future, return an empty list.
        return jsonResponse({ models: [] });
      });

    const out = await callGemini({
      systemPrompt: "Return JSON.",
      userPrompt: "hi",
      model: "gemini-3.0-flash",
      temperature: 0.2,
    });

    expect(out).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalled();

    const generateCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes(":generateContent"),
    );
    expect(generateCall).toBeTruthy();

    const [, init] = generateCall as any[];
    expect(init.method).toBe("POST");
    expect(init.headers["x-goog-api-key"]).toBe("test-key");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("falls back to ?key= URL when header auth is rejected", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url: any, init: any) => {
        const u = String(url);
        if (u.includes(":generateContent") && !u.includes("key=")) {
          // First attempt: reject header-based key.
          return new Response("forbidden", { status: 403 });
        }

        if (u.includes(":generateContent") && u.includes("key=")) {
          // Second attempt: accept key in URL.
          return jsonResponse({
            candidates: [
              {
                content: {
                  parts: [{ text: '{"ok":true}' }],
                },
              },
            ],
          });
        }

        return jsonResponse({ models: [] });
      });

    const out = await callGemini({
      systemPrompt: "Return JSON.",
      userPrompt: "hi",
      model: "gemini-3.0-flash",
      temperature: 0.2,
    });

    expect(out).toEqual({ ok: true });

    const generateCalls = fetchMock.mock.calls
      .map((c) => String(c[0]))
      .filter((u) => u.includes(":generateContent"));

    expect(generateCalls.length).toBeGreaterThanOrEqual(2);
    expect(generateCalls[0]).not.toContain("key=");
    expect(generateCalls.some((u) => u.includes("key="))).toBe(true);
  });
});
