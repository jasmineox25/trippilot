import type {
  ConstraintSnapshot,
  NormalizedConstraintSnapshot,
} from "../schema";

const safeNumber = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export async function normalize(
  snapshot: ConstraintSnapshot,
): Promise<NormalizedConstraintSnapshot> {
  const dep = String(snapshot?.departureTimeISO || "").trim();

  return {
    departureTimeISO: dep,
    travelMode: String(snapshot?.travelMode || "").trim(),
    stops: Array.isArray(snapshot?.places)
      ? snapshot.places.map((p) => ({
          placeId: String(p?.placeId || "").trim(),
          name: String(p?.name || "").trim(),
          lat: safeNumber(p?.lat),
          lng: safeNumber(p?.lng),
          openNow:
            typeof p?.openingHours?.openNow === "boolean"
              ? p.openingHours.openNow
              : undefined,
          weekdayText: Array.isArray(p?.openingHours?.weekdayText)
            ? p.openingHours.weekdayText.map((x) => String(x))
            : undefined,
          recommendedStayMinutes: safeNumber(p?.recommendedStayMinutes),
          priceLevel: safeNumber(p?.priceLevel),
        }))
      : [],
    hasTimingIssues:
      typeof snapshot?.feasibility?.hasTimingIssues === "boolean"
        ? snapshot.feasibility.hasTimingIssues
        : undefined,
    minDepartEarlierMinutes: safeNumber(
      snapshot?.feasibility?.minDepartEarlierMinutes,
    ),
    closedToday: Array.isArray(snapshot?.feasibility?.closedToday)
      ? snapshot.feasibility.closedToday
          .map((x) => ({
            placeId: String((x as any)?.placeId || "").trim(),
            reason: String((x as any)?.reason || "").trim(),
          }))
          .filter((x) => x.placeId)
      : undefined,
  };
}
