import { describe, it, expect, vi, beforeEach } from "vitest";
import { estimateTripBudget } from "./budget";
import { callGemini } from "./client";

// Mock the core client to avoid real API calls
vi.mock("./client", () => ({
  callGemini: vi.fn(),
}));

describe("estimateTripBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPlaces = [
    { id: "1", name: "Eiffel Tower", loc: "Paris", lat: 0, lng: 0 },
    { id: "2", name: "Louvre Museum", loc: "Paris", lat: 0, lng: 0 },
  ];

  it("should parse valid JSON response from Gemini", async () => {
    // Mock successful Gemini response
    const mockResponse = {
      currency: "EUR",
      totalRange: "50-70",
      dailyCostPerPerson: "50 EUR",
      items: [
        { name: "Eiffel Tower", category: "ticket", estimatedCost: "30" },
        { name: "Louvre Museum", category: "ticket", estimatedCost: "22" },
      ],
      disclaimer: "Estimates only.",
    };

    (callGemini as any).mockResolvedValue(mockResponse);

    const result = await estimateTripBudget(mockPlaces, "en", "EUR");

    expect(result.currency).toBe("EUR");
    expect(result.items).toHaveLength(2);
    expect(result.items[0].estimatedCost).toBe("30");
    expect(callGemini).toHaveBeenCalledTimes(1);

    // Verify prompt localization
    const callArgs = (callGemini as any).mock.calls[0][0];
    expect(callArgs.systemPrompt).toContain("Output Language: English");
  });

  it("should handle localized requests (e.g. Japanese)", async () => {
    (callGemini as any).mockResolvedValue({
      currency: "JPY",
      totalRange: "5000-8000",
      items: [],
      dailyCostPerPerson: "5000",
      disclaimer: "Test",
    });

    await estimateTripBudget(mockPlaces, "ja", "JPY");

    const callArgs = (callGemini as any).mock.calls[0][0];
    expect(callArgs.systemPrompt).toContain("Output Language: Japanese");
  });

  it("should throw error on invalid/empty response", async () => {
    (callGemini as any).mockResolvedValue(null); // Simulate empty response

    await expect(estimateTripBudget(mockPlaces)).rejects.toThrow(
      "Invalid budget response format",
    );
  });
});
