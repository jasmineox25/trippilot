declare global {
  interface Window {
    google: any;
  }
}

declare var google: any;
declare const __GMAPS_API_KEY__: string | undefined;

import { TimedCache } from "../utils/timedCache";
import { getLocale, type Locale } from "../i18n/i18n";

let googleMapsPromise: Promise<void> | null = null;
let googleMapsLoadedLanguage: string | null = null;

const toGoogleMapsLanguage = (locale: Locale): string => {
  switch (locale) {
    case "zh":
      return "zh-CN";
    case "ja":
      return "ja";
    case "ko":
      return "ko";
    case "fr":
      return "fr";
    case "es":
      return "es";
    case "de":
      return "de";
    case "pt":
      return "pt";
    case "ru":
      return "ru";
    default:
      return "en";
  }
};

const PLACE_TEXT_SEARCH_CACHE_MS = 10 * 60 * 1000;
const defaultPlaceTextSearchCache = new TimedCache<string, any | null>(
  PLACE_TEXT_SEARCH_CACHE_MS,
);

export const loadGoogleMaps = (input?: { locale?: Locale }): Promise<void> => {
  const locale = input?.locale ?? getLocale();
  const desiredLanguage = toGoogleMapsLanguage(locale);

  // The Maps JS API can only be loaded once per page. If locale changes after load,
  // a full page reload is required to apply a different `language`.
  if (
    window.google &&
    window.google.maps &&
    window.google.maps.importLibrary &&
    googleMapsLoadedLanguage &&
    googleMapsLoadedLanguage !== desiredLanguage
  ) {
    console.warn(
      "Google Maps is already loaded with a different language.",
      JSON.stringify({
        loaded: googleMapsLoadedLanguage,
        desired: desiredLanguage,
      }),
    );
  }

  if (googleMapsPromise) return googleMapsPromise;

  googleMapsLoadedLanguage = desiredLanguage;

  googleMapsPromise = new Promise((resolve, reject) => {
    if (
      window.google &&
      window.google.maps &&
      window.google.maps.importLibrary
    ) {
      resolve();
      return;
    }

    let apiKey = (__GMAPS_API_KEY__ ?? "").trim();

    if (apiKey === "YOUR_OWN_API_KEY_HERE") {
      apiKey = "";
    }

    if (!apiKey) {
      console.warn("Google Maps API Key is missing.");
    }

    (function (g: any) {
      var h: any,
        a: any,
        k: any,
        p = "The Google Maps JavaScript API",
        c = "google",
        l = "importLibrary",
        q = "__ib__",
        m = document,
        b = window as any;
      b = b[c] || (b[c] = {});
      var d = b.maps || (b.maps = {}),
        r = new Set(),
        e = new URLSearchParams(),
        u = () =>
          h ||
          (h = new Promise(async (f, n) => {
            await (a = m.createElement("script"));
            a.async = true;
            e.set("libraries", [...r] + "");
            for (k in g)
              e.set(
                k.replace(/[A-Z]/g, (t: any) => "_" + t[0].toLowerCase()),
                g[k],
              );
            e.set("callback", c + ".maps." + q);
            a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
            d[q] = f;
            a.onerror = () => (h = n(Error(p + " could not load.")));
            a.nonce = (m.querySelector("script[nonce]") as any)?.nonce || "";
            m.head.append(a);
          }));
      d[l]
        ? console.warn(p + " only loads once. Ignoring:", g)
        : (d[l] = (f: any, ...n: any) =>
            r.add(f) && u().then(() => d[l](f, ...n)));
    })({
      key: apiKey,
      v: "weekly",
      language: desiredLanguage,
    });

    resolve();
  });

  return googleMapsPromise;
};

export const searchPlaceByTextQuery = async (input: {
  textQuery: string;
  fields?: string[];
  cache?: TimedCache<string, any | null>;
}): Promise<any | null> => {
  const textQuery = (input.textQuery || "").trim();
  if (!textQuery) return null;

  await loadGoogleMaps();
  const { Place } = (await google.maps.importLibrary("places")) as any;

  const safeDefaultFields = [
    "id",
    "displayName",
    "formattedAddress",
    "location",
    "photos",
    "rating",
    "types",
    "primaryType",
    // Opening hours fields availability varies by project; keep to the most common one.
    "regularOpeningHours",
    "priceLevel",
  ];

  const fields =
    input.fields && input.fields.length > 0 ? input.fields : safeDefaultFields;

  const cache = input.cache ?? defaultPlaceTextSearchCache;

  const cacheKey = `${textQuery.toLowerCase()}|${fields.join(",")}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const doSearch = async (f: string[]) =>
    Place.searchByText({
      textQuery,
      fields: f,
      isOpenNow: false,
    });

  let res: any;
  try {
    res = await doSearch(fields);
  } catch (e: any) {
    const msg = String(e?.message || e || "");
    const hasUnknownFields = msg.toLowerCase().includes("unknown fields");
    if (!hasUnknownFields || fields === safeDefaultFields) throw e;

    console.warn(
      "Place.searchByText failed due to unknown fields; retrying with safe default fields.",
      { fields, error: e },
    );
    res = await doSearch(safeDefaultFields);
  }

  const place = res?.places?.[0] ?? null;
  cache.set(cacheKey, place);
  return place;
};

const openingHoursCache = new TimedCache<
  string,
  { openNow?: boolean; weekdayText?: string[] } | null
>(6 * 60 * 60 * 1000);

export const fetchOpeningHoursByPlaceId = async (
  placeId: string,
): Promise<{ openNow?: boolean; weekdayText?: string[] } | null> => {
  if (!placeId) return null;

  const cached = openingHoursCache.get(placeId);
  if (cached !== undefined) return cached;

  try {
    await loadGoogleMaps();
    const { Place } = (await google.maps.importLibrary("places")) as any;
    if (!Place) return null;

    const p = new Place({ id: placeId });
    if (typeof p.fetchFields !== "function") return null;

    await p.fetchFields({ fields: ["regularOpeningHours"] });

    const regular = p.regularOpeningHours || p.regular_opening_hours;
    const weekdayText =
      regular?.weekdayDescriptions ||
      regular?.weekdayText ||
      regular?.weekday_text ||
      regular?.weekday_descriptions ||
      regular?.weekdayTexts ||
      regular?.weekday_texts;

    if (!Array.isArray(weekdayText) || weekdayText.length === 0) {
      openingHoursCache.set(placeId, null);
      return null;
    }

    const result = {
      weekdayText: weekdayText.map((x: any) => String(x)),
    };
    openingHoursCache.set(placeId, result);
    return result;
  } catch (e) {
    console.warn("fetchOpeningHoursByPlaceId failed", { placeId, error: e });
    openingHoursCache.set(placeId, null);
    return null;
  }
};

export const __testing = {
  clearPlaceTextSearchCache: () => defaultPlaceTextSearchCache.clear(),
};

// Helper wrapper for DirectionsService.route
const runDirectionRoute = async (requestObj: any): Promise<any> => {
  const { DirectionsService } = (await google.maps.importLibrary(
    "routes",
  )) as any;
  const directionsService = new DirectionsService();

  return new Promise((resolve, reject) => {
    try {
      directionsService.route(requestObj, (res: any, status: any) => {
        const ok =
          status === "OK" || status === google.maps.DirectionsStatus.OK;

        if (ok && res && res.routes && res.routes.length > 0) {
          resolve(res);
        } else {
          reject(new Error(String(status)));
        }
      });
    } catch (e) {
      reject(e);
    }
  });
};

const getGoogleTravelMode = async (modeStr: string) => {
  await google.maps.importLibrary("routes");
  switch (modeStr) {
    case "TRANSIT":
      return google.maps.TravelMode.TRANSIT;
    case "WALKING":
      return google.maps.TravelMode.WALKING;
    case "DRIVING":
      return google.maps.TravelMode.DRIVING;
    default:
      return google.maps.TravelMode.DRIVING;
  }
};

// --- HELPER LOGIC ---

const isGooglePlaceId = (id: string) => {
  if (!id) return false;
  if (id.startsWith("start-location")) return false;
  if (id.startsWith("current-location")) return false;
  if (id.includes("simulated")) return false;
  // Real Google Place IDs are usually quite long (20+ chars)
  // Our old mock IDs were "1", "2".
  if (id.length < 10) return false;
  return true;
};

// Check if a result actually has transit steps (subway, bus, train)
// Returns true if we find at least one TRANSIT step.
const hasTransitSteps = (result: any): boolean => {
  try {
    const route = result.routes[0];
    const leg = route.legs[0];
    return leg.steps.some((step: any) => step.travel_mode === "TRANSIT");
  } catch (e) {
    return false;
  }
};

// --- OPTIMIZATION LOGIC ---

const getDistanceFromLatLonInKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
};

const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

const optimizeOrder = (places: any[]) => {
  if (places.length <= 2)
    return { orderedPlaces: places, newIndices: places.map((_, i) => i) };

  const start = places[0];
  const toVisit = places
    .slice(1)
    .map((p, i) => ({ ...p, originalIndex: i + 1 }));
  const orderedPath = [start];
  const newIndices = [0];

  let currentLocation = start;

  while (toVisit.length > 0) {
    let nearestIdx = -1;
    let minDist = Infinity;

    for (let i = 0; i < toVisit.length; i++) {
      const dist = getDistanceFromLatLonInKm(
        Number(currentLocation.lat),
        Number(currentLocation.lng),
        Number(toVisit[i].lat),
        Number(toVisit[i].lng),
      );

      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }

    if (nearestIdx !== -1) {
      const nextPlace = toVisit[nearestIdx];
      orderedPath.push(nextPlace);
      newIndices.push(nextPlace.originalIndex);
      currentLocation = nextPlace;
      toVisit.splice(nearestIdx, 1);
    } else {
      break;
    }
  }

  return { orderedPlaces: orderedPath, newIndices };
};

// Travel-time based optimization (uses Directions API estimates).
// NOTE: This can add API calls (~O(n^2)) for up to 10 stops.
const routeDurationCache = new Map<string, number>();

const nodeKey = (node: any) => {
  const id = String(node?.id || "");
  if (isGooglePlaceId(id)) return `pid:${id}`;
  const lat = Number(node?.lat);
  const lng = Number(node?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng))
    return `ll:${lat.toFixed(6)},${lng.toFixed(6)}`;
  return `unknown:${id}`;
};

const resolveNodeLocation = (node: any) => {
  if (isGooglePlaceId(node?.id)) return { placeId: node.id };
  return { lat: Number(node.lat), lng: Number(node.lng) };
};

const extractDurationSeconds = (res: any): number => {
  try {
    const idx = (res as any).preferredRouteIndex || 0;
    const leg = res.routes[idx].legs[0];
    const val = leg.duration?.value;
    return Number.isFinite(val) ? Number(val) : Infinity;
  } catch {
    return Infinity;
  }
};

const estimateLegDurationSeconds = async (
  startNode: any,
  endNode: any,
  travelMode: string,
  departureTime?: Date,
): Promise<number> => {
  const cacheKey = `${travelMode}|${departureTime ? departureTime.toISOString() : ""}|${nodeKey(startNode)}->${nodeKey(endNode)}`;
  const cached = routeDurationCache.get(cacheKey);
  if (cached != null) return cached;

  const modeEnum = await getGoogleTravelMode(travelMode);
  const origin = resolveNodeLocation(startNode);
  const destination = resolveNodeLocation(endNode);

  const baseRequest: any = {
    origin,
    destination,
    travelMode: modeEnum,
    provideRouteAlternatives: false,
  };

  try {
    let res: any;

    if (travelMode === "TRANSIT") {
      // One attempt only (requested time) for optimization to limit API calls.
      const modes = [
        google.maps.TransitMode.SUBWAY,
        google.maps.TransitMode.TRAIN,
        google.maps.TransitMode.BUS,
      ];

      const reqDate = departureTime || new Date();
      const req = {
        ...baseRequest,
        transitOptions: {
          routingPreference: google.maps.TransitRoutePreference.LESS_WALKING,
          modes,
          departureTime: reqDate,
        },
      };

      res = await runDirectionRoute(req);
      (res as any).preferredRouteIndex = 0;
    } else {
      res = await runDirectionRoute(baseRequest);
      (res as any).preferredRouteIndex = 0;
    }

    const dur = extractDurationSeconds(res);
    routeDurationCache.set(cacheKey, dur);
    return dur;
  } catch (e: any) {
    const msg = e?.message || "";
    if (isCriticalApiError(msg)) {
      routeDurationCache.set(cacheKey, Infinity);
      return Infinity;
    }

    // Fallback to walking estimate if transit/driving fails.
    try {
      const walkReq = {
        origin,
        destination,
        travelMode: "WALKING",
        provideRouteAlternatives: false,
      };
      const walkRes = await runDirectionRoute(walkReq);
      (walkRes as any).preferredRouteIndex = 0;
      const dur = extractDurationSeconds(walkRes);
      routeDurationCache.set(cacheKey, dur);
      return dur;
    } catch {
      routeDurationCache.set(cacheKey, Infinity);
      return Infinity;
    }
  }
};

const optimizeOrderByTravelTime = async (
  places: any[],
  travelMode: string,
  departureTime?: Date,
) => {
  if (places.length <= 2)
    return { orderedPlaces: places, newIndices: places.map((_, i) => i) };

  const start = places[0];
  const toVisit = places
    .slice(1)
    .map((p, i) => ({ ...p, originalIndex: i + 1 }));
  const orderedPath = [start];
  const newIndices = [0];

  let currentLocation = start;

  while (toVisit.length > 0) {
    const durations = await Promise.all(
      toVisit.map((candidate) =>
        estimateLegDurationSeconds(
          currentLocation,
          candidate,
          travelMode,
          departureTime,
        ),
      ),
    );

    let bestIdx = -1;
    let bestDur = Infinity;
    for (let i = 0; i < durations.length; i++) {
      const d = durations[i];
      if (d < bestDur) {
        bestDur = d;
        bestIdx = i;
      }
    }

    if (bestIdx === -1 || bestDur === Infinity) {
      // If we cannot estimate, keep remaining in their current order.
      toVisit.forEach((p) => {
        orderedPath.push(p);
        newIndices.push(p.originalIndex);
      });
      break;
    }

    const nextPlace = toVisit[bestIdx];
    orderedPath.push(nextPlace);
    newIndices.push(nextPlace.originalIndex);
    currentLocation = nextPlace;
    toVisit.splice(bestIdx, 1);
  }

  return { orderedPlaces: orderedPath, newIndices };
};

const isCriticalApiError = (errMsg: string) => {
  return (
    errMsg.includes("REQUEST_DENIED") ||
    errMsg.includes("OVER_QUERY_LIMIT") ||
    errMsg.includes("UNKNOWN_ERROR")
  );
};

export const calculateRoute = async (
  places: any[],
  travelMode: string = "TRANSIT",
  departureTime?: Date,
  shouldOptimize: boolean = true,
): Promise<{ legs: any[]; optimizedPlaces: any[] }> => {
  await loadGoogleMaps();
  await google.maps.importLibrary("routes");

  let workingPlaces = [...places];
  let optimizedPlaces = [...places];

  if (shouldOptimize && places.length > 2) {
    try {
      const result = await optimizeOrderByTravelTime(
        places,
        travelMode,
        departureTime,
      );
      workingPlaces = result.orderedPlaces;
      optimizedPlaces = result.orderedPlaces;
    } catch (e) {
      // Fallback to simple distance-based ordering.
      const result = optimizeOrder(places);
      workingPlaces = result.orderedPlaces;
      optimizedPlaces = result.orderedPlaces;
    }
  }

  let finalLegs: any[] = [];

  for (let i = 0; i < workingPlaces.length - 1; i++) {
    const startNode = workingPlaces[i];
    const endNode = workingPlaces[i + 1];

    const modeEnum = await getGoogleTravelMode(travelMode);

    // Resolve Origin
    let origin: any;
    if (isGooglePlaceId(startNode.id)) {
      origin = { placeId: startNode.id };
    } else {
      origin = { lat: Number(startNode.lat), lng: Number(startNode.lng) };
    }

    // Resolve Destination
    let destination: any;
    if (isGooglePlaceId(endNode.id)) {
      destination = { placeId: endNode.id };
    } else {
      destination = { lat: Number(endNode.lat), lng: Number(endNode.lng) };
    }

    const baseRequest: any = {
      origin: origin,
      destination: destination,
      travelMode: modeEnum,
    };

    try {
      if (travelMode === "TRANSIT") {
        // Define explicit modes to ensure we get transit results and not walking
        const modes = [
          google.maps.TransitMode.SUBWAY,
          google.maps.TransitMode.TRAIN,
          google.maps.TransitMode.BUS,
        ];

        const baseTransitOptions = {
          routingPreference: google.maps.TransitRoutePreference.LESS_WALKING,
          modes: modes,
        };

        const reqDate = departureTime || new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);

        // Define attempts
        // NOTE: departureTime MUST be inside transitOptions for the JS API (v3).
        // Putting it at top level causes "InvalidValueError".
        const attempts = [
          {
            name: "Requested Time",
            options: {
              transitOptions: {
                ...baseTransitOptions,
                departureTime: reqDate,
              },
            },
          },
          {
            name: "Tomorrow Morning",
            options: {
              transitOptions: {
                ...baseTransitOptions,
                departureTime: tomorrow,
              },
            },
            isNextDay: true,
          },
        ];

        let successRes = null;
        let lastError = null;

        for (const attempt of attempts) {
          try {
            const req = { ...baseRequest, ...attempt.options };
            const res = await runDirectionRoute(req);

            successRes = res;
            (res as any).preferredRouteIndex = 0;
            if (attempt.isNextDay) (res as any).isNextDay = true;

            // Classification
            (res as any).isWalkingOnly = !hasTransitSteps(res);
            (res as any).walkingReason = (res as any).isWalkingOnly
              ? "Transit simplified by Google"
              : "Real transit";

            // If we found a route with transit steps, stop trying alternatives
            if (hasTransitSteps(res)) break;

            // If it's walking only, we continue to the next attempt (e.g. Tomorrow)
          } catch (err: any) {
            const msg = err.message || "";
            if (isCriticalApiError(msg)) throw err;
            lastError = msg;
          }
        }

        if (successRes) {
          finalLegs.push(successRes);
        } else {
          throw new Error(lastError || "All transit attempts failed");
        }
      } else {
        // DRIVING / WALKING
        const res = await runDirectionRoute(baseRequest);
        (res as any).preferredRouteIndex = 0;
        finalLegs.push(res);
      }
    } catch (e: any) {
      const msg = e.message || "";

      if (isCriticalApiError(msg)) {
        throw new Error(`API Error: ${msg}`);
      }

      console.warn(`Leg ${i} exhausted all strategies. Fallback to Walking.`);

      try {
        // Fallback
        const walkReq = {
          origin: origin,
          destination: destination,
          travelMode: "WALKING",
        };
        const res = await runDirectionRoute(walkReq);
        (res as any).preferredRouteIndex = 0;
        (res as any).isFallback = true;
        (res as any).fallbackReason = msg;
        finalLegs.push(res);
      } catch (e2) {
        throw new Error(
          `No route available between ${startNode.name} and ${endNode.name}`,
        );
      }
    }
  }

  return { legs: finalLegs, optimizedPlaces };
};
