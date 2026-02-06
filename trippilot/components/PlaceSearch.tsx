import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadGoogleMaps } from "../services/googleMaps";
import { Icon, IconRound } from "./Icon";
import { useI18n } from "../i18n/react";
import {
  extractOpeningHoursFromNewPlace,
  formatOpeningHoursSummary,
} from "../utils/openingHours";
import { fetchWeatherNow, formatWeatherBrief } from "../utils/weather";
import { assessDestinationSuitability } from "../utils/destinationSuitability";
import { getSearchRecommendations } from "../utils/searchRecommendations";
import {
  formatSpendSummary,
  formatTicketSummary,
  normalizePriceLevel,
} from "../utils/cost";

declare const google: any;

const PLACES_TYPEAHEAD_MIN_CHARS_LATIN = 3;
const PLACES_TYPEAHEAD_MIN_CHARS_CJK = 2;
const PLACES_TYPEAHEAD_DEBOUNCE_MS = 800;
const PLACES_TYPEAHEAD_CACHE_MS = 5 * 60 * 1000;
const PLACES_TYPEAHEAD_MAX_RESULTS = 8;
const PLACES_DETAILS_CACHE_MS = 6 * 60 * 60 * 1000;
const PLACES_ALTERNATIVES_CACHE_MS = 10 * 60 * 1000;

const isCjkQuery = (q: string): boolean => {
  // Treat CJK + Japanese kana + Hangul as “CJK-like” for UX.
  // These languages often use 2 characters for meaningful queries (e.g., 上野).
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(
    q,
  );
};

const getTypeaheadMinChars = (q: string): number =>
  isCjkQuery(q)
    ? PLACES_TYPEAHEAD_MIN_CHARS_CJK
    : PLACES_TYPEAHEAD_MIN_CHARS_LATIN;

const toLocaleCacheKey = (locale: string, key: string): string =>
  `${locale}|${key}`;

interface PlaceSearchProps {
  onPlaceSelect: (place: any) => void;
  placeholder?: string;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  focusOnValueChange?: boolean;
}

export const PlaceSearch: React.FC<PlaceSearchProps> = ({
  onPlaceSelect,
  placeholder,
  className,
  value,
  onValueChange,
  focusOnValueChange,
}) => {
  const { l, locale } = useI18n();
  const [inputValue, setInputValue] = useState(value ?? "");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [weatherById, setWeatherById] = useState<Record<string, any>>({});
  const [weatherStateById, setWeatherStateById] = useState<
    Record<string, "idle" | "loading" | "done" | "error">
  >({});
  const [alternativesById, setAlternativesById] = useState<
    Record<
      string,
      { status: "idle" | "loading" | "done" | "error"; items: any[] }
    >
  >({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchCacheRef = useRef<
    Map<string, { ts: number; places: any[]; errorMsg?: string | null }>
  >(new Map());
  const detailsCacheRef = useRef<
    Map<
      string,
      {
        ts: number;
        details:
          | {
              opening?: { open_now?: boolean; weekday_text?: string[] };
              priceLevel?: number;
            }
          | undefined;
      }
    >
  >(new Map());
  const alternativesCacheRef = useRef<
    Map<string, { ts: number; items: any[]; error?: true }>
  >(new Map());
  const [dropdownStyle, setDropdownStyle] = useState<
    | {
        position: "fixed";
        top: number;
        left: number;
        width: number;
        maxHeight: number;
      }
    | undefined
  >(undefined);

  const recommendations = getSearchRecommendations(inputValue, locale);

  const updateInputValue = (next: string) => {
    setInputValue(next);
    onValueChange?.(next);
  };

  useEffect(() => {
    if (typeof value !== "string") return;
    if (value === inputValue) return;
    setInputValue(value);
    if (focusOnValueChange) {
      // Focus after updating so user can immediately confirm/adjust.
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const asText = (v: any): string => {
    if (typeof v === "string") return v;
    if (v && typeof v === "object") {
      // New Places API may return LocalizedText-like objects
      if (typeof v.text === "string") return v.text;
      if (typeof v.name === "string") return v.name;
    }
    return v == null ? "" : String(v);
  };

  const getLatLng = (loc: any): { lat: number; lng: number } | undefined => {
    try {
      if (!loc) return undefined;
      const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
      const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
      if (typeof lat !== "number" || typeof lng !== "number") return undefined;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
      return { lat, lng };
    } catch {
      return undefined;
    }
  };

  useEffect(() => {
    loadGoogleMaps();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!target) return;

      const insideInput = containerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);

      if (!insideInput && !insideDropdown) setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const recomputeDropdownPosition = () => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;

    const gap = 6;
    const spaceBelow = Math.max(0, vh - rect.bottom - gap);
    const spaceAbove = Math.max(0, rect.top - gap);
    const shouldOpenUp = spaceBelow < 220 && spaceAbove > spaceBelow;

    const maxHeight = Math.max(
      120,
      Math.min(240, shouldOpenUp ? spaceAbove : spaceBelow),
    );

    const top = shouldOpenUp
      ? Math.max(gap, rect.top - maxHeight)
      : rect.bottom + gap;

    setDropdownStyle({
      position: "fixed",
      top,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    recomputeDropdownPosition();

    let raf = 0;
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => recomputeDropdownPosition());
    };

    window.addEventListener("resize", schedule);
    // Capture scrolls from any scroll container.
    window.addEventListener("scroll", schedule, true);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const q = (inputValue || "").trim();
    const minChars = getTypeaheadMinChars(q);
    if (!q || q.length < minChars) {
      setPredictions([]);
      setIsOpen(false);
      setErrorMsg(null);
      return;
    }

    // Only run typeahead while the input is focused (avoid background searches when value is set programmatically).
    if (
      typeof document !== "undefined" &&
      inputRef.current &&
      document.activeElement !== inputRef.current
    ) {
      return;
    }

    const cacheKey = `${locale}|${q.toLowerCase()}`;
    const now = Date.now();
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached && now - cached.ts < PLACES_TYPEAHEAD_CACHE_MS) {
      setPredictions(cached.places || []);
      setIsOpen(
        (cached.places?.length || 0) > 0 ||
          getSearchRecommendations(q).length > 0,
      );
      setErrorMsg(cached.errorMsg ?? null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Re-check cache at execution time.
        const currentQ = (inputValue || "").trim();
        const currentKey = `${locale}|${currentQ.toLowerCase()}`;
        const now2 = Date.now();
        const cached2 = searchCacheRef.current.get(currentKey);
        if (cached2 && now2 - cached2.ts < PLACES_TYPEAHEAD_CACHE_MS) {
          setPredictions(cached2.places || []);
          setIsOpen(
            (cached2.places?.length || 0) > 0 ||
              getSearchRecommendations(currentQ).length > 0,
          );
          setErrorMsg(cached2.errorMsg ?? null);
          return;
        }

        await loadGoogleMaps();

        const { Place } = await google.maps.importLibrary("places");

        // Use the New Places API 'searchByText'
        // Some fields may not be enabled for all projects; we fallback to a minimal field set.
        const baseFields = [
          "id",
          "displayName",
          "formattedAddress",
          "location",
          "photos",
          "rating",
          "types",
          "primaryType",
        ];
        const extendedFields = [
          ...baseFields,
          // Opening hours (best-effort)
          "regularOpeningHours",
          // Best-effort spend level (may be unavailable depending on project/API).
          "priceLevel",
        ];

        let places: any[] | undefined;
        try {
          const res = await Place.searchByText({
            textQuery: q,
            fields: extendedFields,
            isOpenNow: false,
          });
          places = res?.places;
        } catch (err) {
          console.warn(
            "Search with opening hours fields failed; retrying with base fields.",
            err,
          );
          const res = await Place.searchByText({
            textQuery: q,
            fields: baseFields,
            isOpenNow: false,
          });
          places = res?.places;
        }

        const finalPlaces = (places || []).slice(
          0,
          PLACES_TYPEAHEAD_MAX_RESULTS,
        );
        setPredictions(finalPlaces);
        searchCacheRef.current.set(cacheKey, {
          ts: Date.now(),
          places: finalPlaces,
        });
        // Show dropdown even if no results, so recommendations can still help.
        setIsOpen(
          (finalPlaces?.length || 0) > 0 ||
            getSearchRecommendations(q).length > 0,
        );
      } catch (e: any) {
        console.error("Place search failed", e);
        const rawMsg = e.message || String(e);
        let displayMsg = "搜索失败，请检查 API Key 配置。";
        if (
          rawMsg.includes("PERMISSION_DENIED") ||
          rawMsg.includes("Places API (New) has not been used")
        ) {
          displayMsg =
            "错误：请在 Google Cloud Console 中启用 'Places API (New)'。";
        } else if (rawMsg.includes("Billing") || rawMsg.includes("quota")) {
          displayMsg = "API 配额不足或未启用计费。";
        }

        setErrorMsg(displayMsg);

        // Cache failures briefly too, to avoid repeated paid retries while misconfigured.
        searchCacheRef.current.set(cacheKey, {
          ts: Date.now(),
          places: [],
          errorMsg: displayMsg,
        });
      } finally {
        setLoading(false);
      }
    }, PLACES_TYPEAHEAD_DEBOUNCE_MS);

    return () => clearTimeout(delayDebounceFn);
  }, [inputValue, locale]);

  useEffect(() => {
    if (!isOpen) return;
    recomputeDropdownPosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, predictions.length, recommendations.length, loading, errorMsg]);

  // Prefetch weather for a few top results to avoid too many requests.
  useEffect(() => {
    if (!isOpen || predictions.length === 0) return;

    const controller = new AbortController();
    const top = predictions.slice(0, 5);

    top.forEach((p) => {
      const id = String(p.id || "");
      if (!id) return;
      if (weatherStateById[id] === "loading" || weatherStateById[id] === "done")
        return;

      const ll = getLatLng(p.location);
      if (!ll) return;

      setWeatherStateById((prev) => ({ ...prev, [id]: "loading" }));
      fetchWeatherNow(ll.lat, ll.lng, controller.signal)
        .then((w) => {
          setWeatherById((prev) => ({ ...prev, [id]: w }));
          setWeatherStateById((prev) => ({ ...prev, [id]: "done" }));
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          console.warn("Weather fetch failed", err);
          setWeatherStateById((prev) => ({ ...prev, [id]: "error" }));
        });
    });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, predictions]);

  const fetchDetailsViaNewPlaces = async (
    placeId: string,
  ): Promise<
    | {
        opening?: { open_now?: boolean; weekday_text?: string[] };
        priceLevel?: number;
      }
    | undefined
  > => {
    try {
      const now = Date.now();
      const cacheKey = toLocaleCacheKey(locale, placeId);
      const cached = detailsCacheRef.current.get(cacheKey);
      if (cached && now - cached.ts < PLACES_DETAILS_CACHE_MS) {
        return cached.details;
      }

      await loadGoogleMaps();
      const { Place } = await google.maps.importLibrary("places");

      if (!Place) return undefined;

      const p = new Place({ id: placeId });
      if (typeof p.fetchFields !== "function") return undefined;

      await p.fetchFields({
        fields: ["regularOpeningHours", "priceLevel"],
      });

      const regular = p.regularOpeningHours || p.regular_opening_hours;
      const weekdayText =
        regular?.weekdayText ||
        regular?.weekday_text ||
        regular?.weekdayDescriptions ||
        regular?.weekday_descriptions ||
        regular?.weekdayTexts ||
        regular?.weekday_texts;

      const normalizedPriceLevel = normalizePriceLevel(
        p.priceLevel ?? p.price_level,
      );

      const details = {
        opening: Array.isArray(weekdayText)
          ? {
              // `open_now` is intentionally omitted here to avoid using beta-only isOpen().
              weekday_text: weekdayText,
            }
          : undefined,
        priceLevel:
          typeof normalizedPriceLevel === "number"
            ? normalizedPriceLevel
            : undefined,
      };

      detailsCacheRef.current.set(cacheKey, { ts: Date.now(), details });
      return details;
    } catch (error) {
      console.warn("Place details fetchFields failed", { placeId, error });
      const cacheKey = toLocaleCacheKey(locale, placeId);
      detailsCacheRef.current.set(cacheKey, {
        ts: Date.now(),
        details: undefined,
      });
      return undefined;
    }
  };

  const handlePredictionSelect = async (place: any) => {
    updateInputValue(asText(place.displayName));
    setIsOpen(false);

    // Prefer stable opening_hours from legacy getDetails, fallback to New Places fields.
    const openingFromNew = extractOpeningHoursFromNewPlace(place);
    const details = await fetchDetailsViaNewPlaces(place.id);
    const openingFromDetails = details?.opening;
    const priceLevelFromDetails = details?.priceLevel;

    const priceLevelFromNew = normalizePriceLevel(
      place.priceLevel ?? place.price_level,
    );

    const legacyShim = {
      place_id: place.id,
      name: asText(place.displayName) || asText(place.formattedAddress),
      formatted_address: asText(place.formattedAddress),
      rating: place.rating,
      types: place.types || (place.primaryType ? [place.primaryType] : []),
      price_level: priceLevelFromDetails ?? priceLevelFromNew,
      opening_hours:
        openingFromDetails || openingFromNew
          ? {
              open_now: openingFromDetails?.open_now ?? openingFromNew?.openNow,
              weekday_text:
                openingFromDetails?.weekday_text ?? openingFromNew?.weekdayText,
            }
          : undefined,
      geometry: {
        location: place.location,
      },
      photos: place.photos
        ? place.photos.map((p: any) => ({
            getUrl: (options: any) => p.getURI(options),
          }))
        : [],
    };

    onPlaceSelect(legacyShim);
    updateInputValue("");
  };

  const chooseAlternativeKeyword = (pred: any, w: any): string => {
    const precip = Number(w?.precipitationMm ?? 0) || 0;
    const wind = Number(w?.windKph ?? 0) || 0;
    const temp =
      typeof w?.temperatureC === "number" ? w.temperatureC : undefined;

    if (precip >= 2) return "museum";
    if (wind >= 35) return "shopping mall";
    if (typeof temp === "number" && (temp <= 0 || temp >= 33)) return "cafe";
    return "museum";
  };

  const fetchAlternatives = async (pred: any) => {
    const id = String(pred?.id || "");
    if (!id) return;
    const current = alternativesById[id];
    if (current?.status === "loading" || current?.status === "done") return;

    try {
      setAlternativesById((prev) => ({
        ...prev,
        [id]: { status: "loading", items: prev[id]?.items || [] },
      }));

      const w = weatherById[id];
      const keyword = chooseAlternativeKeyword(pred, w);
      const near =
        asText(pred.formattedAddress) || asText(pred.displayName) || "";

      const altKey = toLocaleCacheKey(
        locale,
        `${id}|${keyword}|${near.toLowerCase()}`,
      );
      const now = Date.now();
      const cached = alternativesCacheRef.current.get(altKey);
      if (cached && now - cached.ts < PLACES_ALTERNATIVES_CACHE_MS) {
        if (cached.error) {
          setAlternativesById((prev) => ({
            ...prev,
            [id]: { status: "error", items: [] },
          }));
          return;
        }
        setAlternativesById((prev) => ({
          ...prev,
          [id]: { status: "done", items: cached.items || [] },
        }));
        return;
      }

      const { Place } = await google.maps.importLibrary("places");
      const fields = [
        "id",
        "displayName",
        "formattedAddress",
        "location",
        "photos",
        "rating",
        "types",
        "primaryType",
      ];

      const res = await Place.searchByText({
        textQuery: `${keyword} near ${near}`,
        fields,
        isOpenNow: false,
      });

      const items = (res?.places || [])
        .filter((p: any) => p?.id && p.id !== id)
        .slice(0, 5);

      alternativesCacheRef.current.set(altKey, {
        ts: Date.now(),
        items,
      });

      setAlternativesById((prev) => ({
        ...prev,
        [id]: { status: "done", items },
      }));
    } catch (e) {
      console.warn("Alternative search failed", e);
      const w = weatherById[id];
      const keyword = chooseAlternativeKeyword(pred, w);
      const near =
        asText(pred.formattedAddress) || asText(pred.displayName) || "";
      const altKey = toLocaleCacheKey(
        locale,
        `${id}|${keyword}|${near.toLowerCase()}`,
      );
      alternativesCacheRef.current.set(altKey, {
        ts: Date.now(),
        items: [],
        error: true,
      });
      setAlternativesById((prev) => ({
        ...prev,
        [id]: { status: "error", items: [] },
      }));
    }
  };

  const dropdown = useMemo(() => {
    if (!isOpen || (predictions.length === 0 && recommendations.length === 0))
      return null;
    if (typeof document === "undefined") return null;
    if (!dropdownStyle || dropdownStyle.width <= 0) return null;

    return createPortal(
      <div
        ref={dropdownRef}
        className="z-[9999] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-y-auto custom-scrollbar"
        style={dropdownStyle}
      >
        {recommendations.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-700/50">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              {l("推荐搜索", "Recommended searches")}
            </p>
            <div className="flex flex-wrap gap-2">
              {recommendations.map((r) => (
                <button
                  key={r.query}
                  type="button"
                  onMouseDown={(e) => {
                    // Keep focus and dropdown open.
                    e.preventDefault();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updateInputValue(r.query);
                    setIsOpen(true);
                  }}
                  className="text-[11px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  title={
                    r.reason
                      ? `${l("推荐原因：", "Reason: ")}${r.reason}`
                      : r.query
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {predictions.map((pred) => (
          <div
            key={pred.id}
            role="button"
            tabIndex={0}
            onClick={() => handlePredictionSelect(pred)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handlePredictionSelect(pred);
              }
            }}
            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-start gap-3 border-b border-slate-50 dark:border-slate-700/50 last:border-none cursor-pointer"
          >
            <div className="mt-1 text-slate-400">
              <Icon name="location_on" className="text-sm" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {asText(pred.displayName)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-normal break-words">
                {asText(pred.formattedAddress)}
              </p>
              {(() => {
                const summary = formatOpeningHoursSummary(
                  extractOpeningHoursFromNewPlace(pred),
                  locale,
                );
                if (!summary) return null;
                return (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {l("开放时间：", "Hours: ")}
                    {summary}
                  </p>
                );
              })()}

              {(() => {
                const ticket = formatTicketSummary({
                  tag: "Custom",
                  type: "Destination",
                  name: asText(pred.displayName),
                  placeTypes: pred.types,
                  locale,
                });
                if (!ticket) return null;
                return (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {ticket}
                  </p>
                );
              })()}

              {(() => {
                const priceLevel = normalizePriceLevel(
                  pred.priceLevel ?? pred.price_level,
                );
                const spend = formatSpendSummary({
                  priceLevel,
                  placeTypes: pred.types,
                  locale,
                });
                if (!spend) return null;
                return (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {spend}
                  </p>
                );
              })()}

              {(() => {
                const id = String(pred.id || "");
                const w = id ? weatherById[id] : undefined;
                const state = id ? weatherStateById[id] : "idle";
                const suitability = assessDestinationSuitability(
                  pred.types,
                  w,
                  locale,
                );
                const brief = formatWeatherBrief(w, locale);

                if (state === "loading") {
                  return (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      {l("天气：查询中…", "Weather: loading…")}
                    </p>
                  );
                }

                if (!suitability) return null;

                const colorClass =
                  suitability.level === "good"
                    ? "text-emerald-600 dark:text-emerald-300"
                    : suitability.level === "bad"
                      ? "text-rose-600 dark:text-rose-300"
                      : "text-amber-600 dark:text-amber-300";

                return (
                  <div className="mt-0.5">
                    <p className={`text-[11px] font-semibold ${colorClass}`}>
                      {l("天气：", "Weather: ")}
                      {suitability.label}
                      <span className="font-medium text-slate-500 dark:text-slate-400">
                        {brief ? `（${brief}）` : ""}
                        {` ${suitability.reason}`}
                      </span>
                    </p>

                    {suitability.level !== "good" && id ? (
                      <div className="mt-1">
                        {(() => {
                          const alt = alternativesById[id] || {
                            status: "idle" as const,
                            items: [],
                          };

                          if (alt.status === "loading") {
                            return (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                {l("备选：查询中…", "Alternatives: loading…")}
                              </p>
                            );
                          }

                          if (alt.status === "done" && alt.items.length > 0) {
                            return (
                              <div className="flex flex-wrap gap-2">
                                {alt.items.map((p: any) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onMouseDown={(e) => {
                                      // Prevent focus/blur races that close the dropdown.
                                      e.preventDefault();
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handlePredictionSelect(p);
                                    }}
                                    className="text-[11px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                    title={p.formattedAddress}
                                  >
                                    {asText(p.displayName)}
                                  </button>
                                ))}
                              </div>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                // Prevent focus/blur races that close the dropdown.
                                e.preventDefault();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                fetchAlternatives(pred);
                              }}
                              className="text-[11px] font-semibold text-primary hover:underline"
                            >
                              {suitability.level === "bad"
                                ? l(
                                    "推荐附近室内备选",
                                    "Show nearby indoor alternatives",
                                  )
                                : l(
                                    "天气一般，看看附近室内备选",
                                    "Weather is mixed — see nearby indoor alternatives",
                                  )}
                            </button>
                          );
                        })()}
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          </div>
        ))}
      </div>,
      document.body,
    );
  }, [
    alternativesById,
    dropdownStyle,
    isOpen,
    predictions,
    recommendations,
    weatherById,
    weatherStateById,
    l,
    locale,
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative group w-full ${className || ""}`}
    >
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        <Icon name="search" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => updateInputValue(e.target.value)}
        placeholder={placeholder || l("搜索地点…", "Search for a place...")}
        className={`w-full pl-10 pr-4 py-3 rounded-xl border-none bg-slate-100 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm ${errorMsg ? "ring-2 ring-red-500 bg-red-50 dark:bg-red-900/10" : ""}`}
      />
      {loading && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-primary">
          <IconRound name="sync" className="animate-spin" />
        </div>
      )}

      {errorMsg && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 p-3 bg-red-50 dark:bg-red-900/90 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-200 font-bold shadow-lg animate-in fade-in slide-in-from-top-1">
          <div className="flex items-start gap-2">
            <IconRound name="error" className="shrink-0 text-lg" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {dropdown}
    </div>
  );
};
