import { describe, expect, it, vi } from "vitest";

vi.mock("../client", () => {
  return {
    callGemini: vi.fn(),
  };
});

describe("decide", async () => {
  const { decide } = await import("./step3.decide");
  const { callGemini } = await import("../client");

  it("coerces and filters model output to schema", async () => {
    (callGemini as any).mockResolvedValue({
      riskLevel: "medium",
      riskyStops: [{ placeId: "p1", reason: "late" }],
      suggestedActions: [
        { type: "reorder", target: "b,a" },
        { type: "unknown", target: "x" },
        { type: "reduce_stay", target: "p1", value: 20 },
        { type: "start_earlier", value: "NaN" },
      ],
    });

    const out = await decide({
      riskLevel: "low",
      riskyStops: [],
      conflicts: [],
    } as any);

    expect(out.riskLevel).toBe("medium");
    expect(out.riskyStops).toEqual([{ placeId: "p1", reason: "late" }]);
    expect(out.suggestedActions).toEqual([
      { type: "reorder", target: "b,a", value: undefined },
      { type: "reorder", target: "x", value: undefined },
      { type: "reduce_stay", target: "p1", value: 20 },
      { type: "start_earlier", target: undefined, value: undefined },
    ]);
  });
});
