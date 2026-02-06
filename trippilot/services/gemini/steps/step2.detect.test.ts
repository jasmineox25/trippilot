import { describe, expect, it, vi } from "vitest";

vi.mock("../client", () => {
  return {
    callGemini: vi.fn(),
  };
});

describe("detectConflicts", async () => {
  const { detectConflicts } = await import("./step2.detect");
  const { callGemini } = await import("../client");

  it("coerces and filters model output to schema", async () => {
    (callGemini as any).mockResolvedValue({
      riskLevel: "weird",
      riskyStops: [
        { placeId: "p1", reason: "closing soon" },
        { placeId: "", reason: "missing" },
      ],
      conflicts: [
        { kind: "distance", severity: "medium", message: "Too far" },
        { kind: "nope", severity: "nope", message: "Unknown kind" },
        { kind: "timing", severity: "high", message: "" },
      ],
    });

    const out = await detectConflicts({
      departureTimeISO: "2026-01-01T00:00:00.000Z",
      travelMode: "WALKING",
      stops: [],
    } as any);

    expect(out.riskLevel).toBe("low");
    expect(out.riskyStops).toEqual([{ placeId: "p1", reason: "closing soon" }]);
    expect(out.conflicts).toEqual([
      {
        kind: "distance",
        placeId: undefined,
        severity: "medium",
        message: "Too far",
      },
      {
        kind: "other",
        placeId: undefined,
        severity: "low",
        message: "Unknown kind",
      },
    ]);
  });
});
