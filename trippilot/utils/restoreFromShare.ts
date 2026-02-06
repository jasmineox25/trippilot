import type { ShareTripPayload } from "./shareLink";
import type { Place } from "../data";
import { IMAGES } from "../constants";
import { getPlaceTips } from "./placeTips";
import type { TravelMode } from "../App";

export const restoreTripFromSharePayload = (
  payload: ShareTripPayload,
): {
  myTrip: Place[];
  departureTime: string;
  travelMode: TravelMode;
} => {
  const tripItems = (() => {
    if ((payload as any).v === 2) {
      const arr = (payload as any).trip as Array<any>;
      return arr
        .map((t) => {
          if (!Array.isArray(t) || t.length < 3) return null;
          const id = String(t[0] || "").trim();
          const name = String(t[1] || "").trim();
          const loc = String(t[2] || "").trim();
          const lat = typeof t[3] === "number" ? t[3] : undefined;
          const lng = typeof t[4] === "number" ? t[4] : undefined;
          if (!id || !name) return null;
          return { id, name, loc, lat, lng };
        })
        .filter(Boolean) as Array<{
        id: string;
        name: string;
        loc: string;
        lat?: number;
        lng?: number;
      }>;
    }

    const arr = (payload as any).trip as Array<any>;
    return arr
      .map((p) => {
        const id = String(p?.id || "").trim();
        const name = String(p?.name || "").trim();
        const loc = String(p?.loc || "").trim();
        const lat = typeof p?.lat === "number" ? p.lat : undefined;
        const lng = typeof p?.lng === "number" ? p.lng : undefined;
        const rating = typeof p?.rating === "number" ? p.rating : undefined;
        const tag = typeof p?.tag === "string" ? p.tag : undefined;
        const type = typeof p?.type === "string" ? p.type : undefined;
        const placeTypes = Array.isArray(p?.placeTypes)
          ? p.placeTypes
          : undefined;
        const openingHours = p?.openingHours;
        const priceLevel =
          typeof p?.priceLevel === "number" ? p.priceLevel : undefined;
        if (!id || !name) return null;
        return {
          id,
          name,
          loc,
          lat,
          lng,
          rating,
          tag,
          type,
          placeTypes,
          openingHours,
          priceLevel,
        };
      })
      .filter(Boolean) as Array<any>;
  })();

  const restored: Place[] = tripItems.map((p, idx) => {
    const isStart = idx === 0;
    const tag = isStart ? "Start" : "Custom";
    const type = isStart ? "Location" : "Destination";
    const placeTypes = Array.isArray((p as any).placeTypes)
      ? (p as any).placeTypes
      : [];
    const openingHours = (p as any).openingHours;

    return {
      id: p.id,
      name: p.name,
      loc: p.loc,
      lat: p.lat,
      lng: p.lng,
      rating:
        typeof (p as any).rating === "number"
          ? (p as any).rating
          : isStart
            ? 0
            : 4.5,
      img: IMAGES.MAP_VIEW_THUMB,
      tag: typeof (p as any).tag === "string" ? (p as any).tag : tag,
      type: typeof (p as any).type === "string" ? (p as any).type : type,
      placeTypes,
      openingHours,
      priceLevel: (p as any).priceLevel,
      tips: getPlaceTips({
        name: p.name,
        loc: p.loc,
        type: isStart ? "Start" : "Destination",
        placeTypes,
        openingHours,
        priceLevel: (p as any).priceLevel,
      }),
    };
  });

  return {
    myTrip: restored,
    departureTime: payload.departureTime,
    travelMode: payload.travelMode as TravelMode,
  };
};
