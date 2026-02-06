export interface GeminiDecision {
  riskLevel: "low" | "medium" | "high";

  riskyStops: {
    placeId: string;
    reason: string;
  }[];

  suggestedActions: {
    type: "reorder" | "reduce_stay" | "start_earlier";
    target?: string;
    value?: number;
  }[];
}

export interface ConstraintSnapshot {
  // ISO string (from datetime-local or Date.toISOString)
  departureTimeISO: string;
  travelMode: string;

  // The system-computed itinerary (complex object in-app); we intentionally keep it broad.
  places: Array<{
    placeId: string;
    name: string;
    loc?: string;
    lat?: number;
    lng?: number;
    openingHours?: {
      openNow?: boolean;
      weekdayText?: string[];
    };
    recommendedStayMinutes?: number;
    priceLevel?: number;
  }>;

  // Optional feasibility pre-computed by the system.
  feasibility?: {
    hasTimingIssues?: boolean;
    minDepartEarlierMinutes?: number;
    closedToday?: Array<{ placeId: string; reason: string }>;
  };
}

export interface NormalizedConstraintSnapshot {
  departureTimeISO: string;
  travelMode: string;
  stops: Array<{
    placeId: string;
    name: string;
    lat?: number;
    lng?: number;
    openNow?: boolean;
    weekdayText?: string[];
    recommendedStayMinutes?: number;
    priceLevel?: number;
  }>;
  hasTimingIssues?: boolean;
  minDepartEarlierMinutes?: number;
  closedToday?: Array<{ placeId: string; reason: string }>;
}

export interface GeminiConflicts {
  riskLevel: "low" | "medium" | "high";
  riskyStops: { placeId: string; reason: string }[];
  conflicts: Array<{
    kind: "timing" | "distance" | "closed" | "budget" | "other";
    placeId?: string;
    severity: "low" | "medium" | "high";
    message: string;
  }>;
}
