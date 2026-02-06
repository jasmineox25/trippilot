import type { Place } from "../data";

const STORAGE_KEY = "trippilot_recently_viewed_v1";
const LEGACY_STORAGE_KEY = "tripoptimizer_recently_viewed_v1";
const MAX_ITEMS = 5;

type StoredPlace = Pick<
  Place,
  "id" | "name" | "loc" | "rating" | "img" | "tag" | "type" | "description"
> & {
  lat?: number;
  lng?: number;
};

const isStoredPlace = (v: any): v is StoredPlace => {
  if (!v || typeof v !== "object") return false;
  if (typeof v.id !== "string" || v.id.trim() === "") return false;
  if (typeof v.name !== "string" || v.name.trim() === "") return false;
  if (typeof v.loc !== "string" || v.loc.trim() === "") return false;
  if (typeof v.rating !== "number") return false;
  if (typeof v.img !== "string" || v.img.trim() === "") return false;
  if (typeof v.tag !== "string") return false;
  if (typeof v.type !== "string") return false;
  if (v.description != null && typeof v.description !== "string") return false;
  if (v.lat != null && typeof v.lat !== "number") return false;
  if (v.lng != null && typeof v.lng !== "number") return false;
  return true;
};

export const loadRecentlyViewed = (): Place[] => {
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // One-time migration: if we loaded legacy data, persist it under the new key.
    try {
      if (
        !window.localStorage.getItem(STORAGE_KEY) &&
        window.localStorage.getItem(LEGACY_STORAGE_KEY)
      ) {
        window.localStorage.setItem(STORAGE_KEY, raw);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {
      // Ignore.
    }

    return parsed.filter(isStoredPlace).map((p) => ({
      id: p.id,
      name: p.name,
      loc: p.loc,
      lat: p.lat,
      lng: p.lng,
      rating: p.rating,
      img: p.img,
      tag: p.tag,
      type: p.type,
      description: p.description,
    }));
  } catch {
    return [];
  }
};

export const recordRecentlyViewed = (place: Place): Place[] => {
  try {
    const current = loadRecentlyViewed();
    const next = [place, ...current.filter((p) => p.id !== place.id)].slice(
      0,
      MAX_ITEMS,
    );

    const stored: StoredPlace[] = next.map((p) => ({
      id: p.id,
      name: p.name,
      loc: p.loc,
      lat: p.lat,
      lng: p.lng,
      rating: p.rating,
      img: p.img,
      tag: p.tag,
      type: p.type,
      description: p.description,
    }));

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    return next;
  } catch {
    return [];
  }
};
