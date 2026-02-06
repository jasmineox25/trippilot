import { describe, expect, it } from "vitest";
import { applyGeminiReorder } from "./geminiActions";

describe("applyGeminiReorder", () => {
  it("reorders places by id order and keeps all places", () => {
    const places = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const out = applyGeminiReorder(places, "b,a");
    expect(out.map((p) => p.id)).toEqual(["b", "a", "c"]);
  });

  it("ignores unknown ids and keeps original order if no real change", () => {
    const places = [{ id: "a" }, { id: "b" }];
    const out = applyGeminiReorder(places, "a,missing,b");
    expect(out.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("returns original when target is empty or too short", () => {
    const places = [{ id: "a" }, { id: "b" }];
    expect(applyGeminiReorder(places, "")).toBe(places);
    expect(applyGeminiReorder(places, "a")).toBe(places);
  });
});
