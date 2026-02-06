import React, { useState, useEffect } from "react";
import { Icon, IconRound } from "../Icon";
import { IMAGES } from "../../constants";
import { Place } from "../../data";
import { ViewState } from "../../App";
import { PlaceSearch } from "../PlaceSearch";
import { ItineraryPlannerChatbot } from "../ItineraryPlannerChatbot";
import {
  loadGoogleMaps,
  searchPlaceByTextQuery,
} from "../../services/googleMaps";
import {
  formatStayMinutes,
  getRecommendedStay,
} from "../../utils/recommendedStay";
import {
  extractOpeningHoursFromLegacyShim,
  extractOpeningHoursFromNewPlace,
  formatOpeningHoursSummary,
} from "../../utils/openingHours";
import { getPlaceTips, formatTipsSummary } from "../../utils/placeTips";
import { formatSpendSummary, formatTicketSummary } from "../../utils/cost";
import { getGeminiTrendingSuggestions } from "../../services/gemini/trending";
import {
  loadRecentlyViewed,
  recordRecentlyViewed,
} from "../../utils/recentlyViewed";
import {
  listCommunityTrips,
  type CommunityTripV1,
} from "../../services/firebase/communityTrips";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../i18n/react";

declare const __GMAPS_API_KEY__: string | undefined;
declare const google: any;

interface HomeViewProps {
  onNavigate: (view: ViewState) => void;
  myTrip: Place[];
  setMyTrip: React.Dispatch<React.SetStateAction<Place[]>>;
  onAddPlace: (place: Place) => void;
  onRemovePlace: (id: string) => void;
  departureTime: string;
  setDepartureTime: (time: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  myTrip,
  setMyTrip,
  onAddPlace,
  onRemovePlace,
  departureTime,
  setDepartureTime,
}) => {
  const { l, locale } = useI18n();
  const { user, openAuth } = useAuth();
  const [inlineLogoSvg, setInlineLogoSvg] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    try {
      return localStorage.getItem("tp_onboarding_dismissed_v1") !== "1";
    } catch {
      return true;
    }
  });
  const [seenHomeBefore, setSeenHomeBefore] = useState<boolean>(() => {
    try {
      return localStorage.getItem("tp_seen_home_v1") === "1";
    } catch {
      return false;
    }
  });
  const [showCommunityNudge, setShowCommunityNudge] = useState<boolean>(() => {
    try {
      return localStorage.getItem("tp_community_nudge_dismissed_v1") !== "1";
    } catch {
      return true;
    }
  });
  const [communityPreview, setCommunityPreview] = useState<CommunityTripV1[]>(
    [],
  );
  const [communityPreviewState, setCommunityPreviewState] = useState<
    "idle" | "loading"
  >("idle");

  const shouldShowCommunityNudge =
    showCommunityNudge && !showWelcome && seenHomeBefore;
  const [onboardingStep, setOnboardingStep] = useState<0 | 1 | 2>(0);
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null);
  const [trendingPlaces, setTrendingPlaces] = useState<Place[]>([]);
  const [trendingState, setTrendingState] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [trendingRefreshNonce, setTrendingRefreshNonce] = useState(0);
  const [recentlyViewed, setRecentlyViewed] = useState<Place[]>(() =>
    loadRecentlyViewed(),
  );
  const [openNearbyMenuId, setOpenNearbyMenuId] = useState<string | null>(null);
  const tripDuration = myTrip.length * 2 + 0.5;

  const dismissWelcome = () => {
    setShowWelcome(false);
    try {
      localStorage.setItem("tp_onboarding_dismissed_v1", "1");
    } catch {
      // Ignore
    }
  };

  const dismissCommunityNudge = () => {
    setShowCommunityNudge(false);
    try {
      localStorage.setItem("tp_community_nudge_dismissed_v1", "1");
    } catch {
      // Ignore
    }
  };

  const copySamplePrompt = async () => {
    const sample = (() => {
      switch (locale) {
        case "zh":
          return "罗马2天，喜欢博物馆和建筑，晚上想看夜景";
        case "ja":
          return "ローマで2日、博物館と建築が好きで、夜景も見たい";
        case "ko":
          return "로마에서 2일, 박물관과 건축을 좋아하고 야경도 보고 싶어요";
        case "fr":
          return "2 jours à Rome, j’aime les musées et l’architecture, et je veux voir des vues nocturnes";
        case "es":
          return "2 días en Roma, me gustan los museos y la arquitectura, y quiero ver vistas nocturnas";
        case "de":
          return "2 Tage in Rom, ich mag Museen und Architektur und möchte Nachtansichten sehen";
        case "pt":
          return "2 dias em Roma, gosto de museus e arquitetura e quero ver vistas noturnas";
        case "ru":
          return "2 дня в Риме, люблю музеи и архитектуру и хочу увидеть ночные виды";
        default:
          return "2 days in Rome, I like museums and architecture, and want night views";
      }
    })();

    try {
      await navigator.clipboard.writeText(sample);
      setWelcomeToast(
        l("已复制示例，可直接粘贴", "Copied sample — paste it anywhere"),
      );
    } catch {
      // Best-effort fallback.
      try {
        window.prompt(l("复制这段示例：", "Copy this sample:"), sample);
      } catch {
        // Ignore
      }
    }

    setTimeout(() => setWelcomeToast(null), 2200);
  };

  const scrollToPlanner = () => {
    try {
      document
        .getElementById("trip-configurator")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      // Ignore
    }
  };

  const goPrevOnboardingStep = () => {
    setOnboardingStep((s) => (s === 0 ? 0 : s === 1 ? 0 : 1));
  };

  const goNextOnboardingStep = () => {
    setOnboardingStep((s) => (s === 2 ? 2 : s === 0 ? 1 : 2));
  };

  const isOnboardingStep = (step: 0 | 1 | 2): boolean =>
    showWelcome && onboardingStep === step;

  useEffect(() => {
    let cancelled = false;
    const url = "/icon-prd-2.svg?v=20260202";
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("bad"))))
      .then((raw) => {
        if (cancelled) return;
        const trimmed = (raw || "").trim();
        if (!trimmed.startsWith("<svg")) return;

        const normalized = trimmed
          .replace(/\s(width|height)="[^"]*"/g, "")
          .replace(
            "<svg",
            '<svg width="100%" height="100%" preserveAspectRatio="xMinYMid meet" style="display:block"',
          );

        setInlineLogoSvg(normalized);
      })
      .catch(() => {
        // Best-effort: fall back to <img>.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Mark that the user has visited Home before.
    // We intentionally do this after first render, so the first landing stays minimal.
    try {
      if (localStorage.getItem("tp_seen_home_v1") !== "1") {
        localStorage.setItem("tp_seen_home_v1", "1");
      }
    } catch {
      // Ignore.
    }

    // If the user already had the flag set, ensure state reflects it.
    setSeenHomeBefore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!shouldShowCommunityNudge) return;
    let cancelled = false;
    setCommunityPreviewState("loading");
    void listCommunityTrips({ max: 3 })
      .then((items) => {
        if (cancelled) return;
        setCommunityPreview(Array.isArray(items) ? items : []);
        setCommunityPreviewState("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setCommunityPreview([]);
        setCommunityPreviewState("idle");
      });

    return () => {
      cancelled = true;
    };
  }, [shouldShowCommunityNudge]);

  useEffect(() => {
    if (!showWelcome) return;
    const id =
      onboardingStep === 0
        ? "onboarding-step-idea"
        : onboardingStep === 1
          ? "onboarding-step-places"
          : "onboarding-step-generate";

    const t = window.setTimeout(() => {
      try {
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        // Ignore
      }
    }, 50);

    return () => {
      window.clearTimeout(t);
    };
  }, [showWelcome, onboardingStep]);

  const formatStopLabel = (stopIndex1Based: number): string => {
    switch (locale) {
      case "zh":
        return `第 ${stopIndex1Based} 站`;
      case "ja":
        return `立ち寄り ${stopIndex1Based}`;
      case "ko":
        return `경유지 ${stopIndex1Based}`;
      case "fr":
        return `Étape ${stopIndex1Based}`;
      case "es":
        return `Parada ${stopIndex1Based}`;
      case "de":
        return `Stopp ${stopIndex1Based}`;
      case "pt":
        return `Parada ${stopIndex1Based}`;
      case "ru":
        return `Остановка ${stopIndex1Based}`;
      default:
        return `Stop ${stopIndex1Based}`;
    }
  };

  const formatEditStopPlaceholder = (stopIndex1Based: number): string => {
    switch (locale) {
      case "zh":
        return `编辑第 ${stopIndex1Based} 站…`;
      case "ja":
        return `立ち寄り ${stopIndex1Based} を編集...`;
      case "ko":
        return `${stopIndex1Based}번째 경유지 편집...`;
      case "fr":
        return `Modifier l'étape ${stopIndex1Based}...`;
      case "es":
        return `Editar parada ${stopIndex1Based}...`;
      case "de":
        return `Stopp ${stopIndex1Based} bearbeiten...`;
      case "pt":
        return `Editar parada ${stopIndex1Based}...`;
      case "ru":
        return `Редактировать остановку ${stopIndex1Based}...`;
      default:
        return `Edit stop ${stopIndex1Based}...`;
    }
  };

  const formatPlacesCountLabel = (count: number): string => {
    switch (locale) {
      case "zh":
        return `${count} 个地点`;
      case "ja":
        return `${count} 件`;
      case "ko":
        return `${count}곳`;
      case "fr":
        return `${count} lieux`;
      case "es":
        return `${count} lugares`;
      case "de":
        return `${count} Orte`;
      case "pt":
        return `${count} lugares`;
      case "ru":
        return `${count} мест`;
      default:
        return `${count} Places`;
    }
  };

  const formatTripDurationLabel = (hours: number): string => {
    const v = Number.isFinite(hours) ? hours : 0;
    switch (locale) {
      case "zh":
        return `${v}小时`;
      case "ja":
        return `${v}時間`;
      case "ko":
        return `${v}시간`;
      case "fr":
        return `${v} h`;
      case "es":
        return `${v} h`;
      case "de":
        return `${v} h`;
      case "pt":
        return `${v} h`;
      case "ru":
        return `${v} ч`;
      default:
        return `${v}h`;
    }
  };

  const pushRecentlyViewed = (place: Place) => {
    const next = recordRecentlyViewed(place);
    if (next.length > 0) setRecentlyViewed(next);
  };

  useEffect(() => {
    // Keep in sync with updates coming from other views via App-level handlers.
    setRecentlyViewed(loadRecentlyViewed());
  }, [myTrip.length]);

  const getTrendingErrorHint = (msg: string): string => {
    const m = (msg || "").toLowerCase();
    if (
      m.includes("vite_gemini_api_key") ||
      m.includes("missing vites_gemini") ||
      m.includes("missing gemini api key")
    ) {
      return l(
        "未配置 Gemini Key：请在 .env 设置 VITE_GEMINI_API_KEY 后重启 dev server。",
        "Gemini API key missing: set VITE_GEMINI_API_KEY in .env and restart the dev server.",
      );
    }
    if (m.includes("gemini call failed") || m.includes("generativelanguage")) {
      return l(
        "Gemini 请求失败：请检查 VITE_GEMINI_API_KEY / VITE_GEMINI_MODEL 是否正确，以及网络是否可访问 Google APIs。",
        "Gemini request failed: check VITE_GEMINI_API_KEY / VITE_GEMINI_MODEL and network access to Google APIs.",
      );
    }
    if (
      m.includes("no places results") ||
      m.includes("places") ||
      m.includes("google maps") ||
      m.includes("importlibrary")
    ) {
      return l(
        "Google Places 不可用：无法把 Gemini 推荐解析成可添加的地点（请检查 VITE_GOOGLE_MAPS_API_KEY 与 Places API）。",
        "Google Places unavailable: can't resolve Gemini suggestions into addable places (check VITE_GOOGLE_MAPS_API_KEY and Places API).",
      );
    }
    return l(
      "推荐服务暂不可用。",
      "Recommendations are temporarily unavailable.",
    );
  };

  const [isLocating, setIsLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [destSearchValue, setDestSearchValue] = useState("");
  const [tagAddError, setTagAddError] = useState<string | null>(null);

  useEffect(() => {
    if (editingIndex == null) return;
    if (editingIndex < 0 || editingIndex >= myTrip.length) {
      setEditingIndex(null);
    }
  }, [editingIndex, myTrip.length]);

  // API Key Config State
  const [showConfigBanner, setShowConfigBanner] = useState(false);
  const [configMessage, setConfigMessage] = useState("");

  useEffect(() => {
    // Check API Key Status
    const envKey = (__GMAPS_API_KEY__ ?? "").trim();

    if (!envKey || envKey === "YOUR_OWN_API_KEY_HERE") {
      setConfigMessage(
        l(
          "缺少 Google Maps API Key：请在 .env 设置 VITE_GOOGLE_MAPS_API_KEY 并重启 dev server 以启用地图功能。",
          "Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY in .env and restart the dev server to enable map features.",
        ),
      );
      setShowConfigBanner(true);
    } else {
      setShowConfigBanner(false);
    }
  }, [l]);

  useEffect(() => {
    let cancelled = false;

    const getBaseHintFromPlace = (place?: Place | null): string => {
      if (!place) return "";
      const loc = (place.loc || "").trim();
      if (loc && loc.toLowerCase() !== "current position") return loc;
      if (typeof place.lat === "number" && typeof place.lng === "number") {
        const lat = Number.isFinite(place.lat) ? place.lat.toFixed(3) : "";
        const lng = Number.isFinite(place.lng) ? place.lng.toFixed(3) : "";
        if (lat && lng) return `near ${lat},${lng}`;
      }
      return (place.name || "").trim();
    };

    const reverseGeocodeLocality = async (lat: number, lng: number) => {
      try {
        await loadGoogleMaps();
        const geocoder = new google.maps.Geocoder();

        const results: any[] = await new Promise((resolve, reject) => {
          geocoder.geocode(
            { location: { lat, lng } },
            (res: any, status: any) => {
              const ok =
                status === "OK" || status === google.maps.GeocoderStatus?.OK;
              if (!ok) return reject(new Error(String(status)));
              resolve(Array.isArray(res) ? res : []);
            },
          );
        });

        const components = results?.[0]?.address_components;
        if (!Array.isArray(components)) return null;

        const pick = (type: string) =>
          components.find((c: any) =>
            Array.isArray(c?.types) ? c.types.includes(type) : false,
          )?.long_name;

        const locality = pick("locality") || pick("postal_town");
        const admin1 = pick("administrative_area_level_1");
        const country = pick("country");

        const parts = [locality, admin1, country].filter(
          (x) => typeof x === "string" && x.trim() !== "",
        );
        return parts.length > 0 ? parts.join(", ") : null;
      } catch {
        return null;
      }
    };

    const resolveTrendingLocationHint = async (): Promise<string> => {
      // Prefer most recent searched/selected place; fall back to current trip start.
      const preferred = recentlyViewed?.[0] ?? myTrip?.[0] ?? null;
      if (!preferred) return "";

      const loc = (preferred.loc || "").trim();
      const hasCoords =
        typeof preferred.lat === "number" && typeof preferred.lng === "number";

      // If we only have a generic location label, try reverse-geocoding into a locality.
      if (hasCoords && (!loc || loc.toLowerCase() === "current position")) {
        const city = await reverseGeocodeLocality(
          preferred.lat!,
          preferred.lng!,
        );
        if (city) return city;
      }

      return getBaseHintFromPlace(preferred);
    };

    const asText = (v: any): string => {
      if (typeof v === "string") return v;
      if (v && typeof v === "object") {
        if (typeof (v as any).text === "string") return (v as any).text;
        if (typeof (v as any).name === "string") return (v as any).name;
      }
      return v == null ? "" : String(v);
    };

    const toLegacyShim = (place: any, reason?: string, category?: string) => {
      if (!place?.location) return null;
      const photoShim = place.photos
        ? place.photos.map((p: any) => ({
            getUrl: (options: any) => p.getURI(options),
          }))
        : [];

      const extracted = extractOpeningHoursFromNewPlace(place);
      const openingFromNew = extracted
        ? {
            open_now: extracted.openNow,
            weekday_text: extracted.weekdayText,
          }
        : undefined;

      return {
        place_id: place.id,
        name: asText(place.displayName) || asText(place.formattedAddress),
        formatted_address: asText(place.formattedAddress),
        rating: place.rating,
        types: place.types || (place.primaryType ? [place.primaryType] : []),
        price_level:
          typeof place.priceLevel === "number"
            ? place.priceLevel
            : typeof place.price_level === "number"
              ? place.price_level
              : undefined,
        opening_hours: openingFromNew,
        geometry: { location: place.location },
        photos: photoShim,
        __gemini_reason: reason,
        __gemini_category: category,
      };
    };

    const buildPlaceFromLegacyShim = (legacyShim: any): Place | null => {
      if (!legacyShim?.geometry?.location) return null;
      const openingHours = extractOpeningHoursFromLegacyShim(legacyShim);
      const placeTypes = Array.isArray(legacyShim.types)
        ? legacyShim.types
        : [];
      const reason =
        typeof legacyShim.__gemini_reason === "string"
          ? legacyShim.__gemini_reason
          : undefined;

      const category =
        typeof legacyShim.__gemini_category === "string"
          ? legacyShim.__gemini_category
          : undefined;

      return {
        id: legacyShim.place_id || Math.random().toString(),
        name: legacyShim.name || legacyShim.formatted_address,
        loc: legacyShim.formatted_address || "Unknown location",
        lat: legacyShim.geometry.location.lat(),
        lng: legacyShim.geometry.location.lng(),
        rating: legacyShim.rating || 4.5,
        category,
        placeTypes,
        openingHours,
        priceLevel:
          typeof legacyShim.price_level === "number"
            ? legacyShim.price_level
            : undefined,
        tips: getPlaceTips({
          name: legacyShim.name || legacyShim.formatted_address,
          loc: legacyShim.formatted_address || "",
          type: "Destination",
          placeTypes,
          openingHours,
          priceLevel:
            typeof legacyShim.price_level === "number"
              ? legacyShim.price_level
              : undefined,
        }),
        img:
          legacyShim.photos && legacyShim.photos.length > 0
            ? legacyShim.photos[0].getUrl({ maxWidth: 400 })
            : IMAGES.MAP_VIEW_THUMB,
        tag: l("Gemini 推荐", "Gemini suggestion"),
        type: "Destination",
        description: reason,
      };
    };

    const refreshTrending = async () => {
      const locationHint = (await resolveTrendingLocationHint()).trim();
      if (!locationHint) {
        setTrendingError(null);
        setTrendingPlaces([]);
        setTrendingState("idle");
        return;
      }

      setTrendingState("loading");
      setTrendingError(null);

      try {
        const suggestions = await getGeminiTrendingSuggestions({
          locationHint,
          dateISO: new Date().toISOString(),
          count: 3,
          locale,
        });

        if (suggestions.length === 0) {
          throw new Error("Gemini returned no suggestions.");
        }

        await loadGoogleMaps();
        const { Place } = await google.maps.importLibrary("places");

        const fields = [
          "id",
          "displayName",
          "formattedAddress",
          "location",
          "photos",
          "types",
          "primaryType",
          "regularOpeningHours",
        ];

        const results = await Promise.all(
          suggestions.map(async (s) => {
            try {
              const res = await Place.searchByText({
                textQuery: s.query,
                fields,
                isOpenNow: false,
              });
              const first = res?.places?.[0];
              const shim = first
                ? toLegacyShim(first, s.reason, s.category)
                : null;
              return shim ? buildPlaceFromLegacyShim(shim) : null;
            } catch (err) {
              console.warn("Place.searchByText failed", {
                query: s?.query,
                error: err,
              });
              return null;
            }
          }),
        );

        const dedup = new Map<string, Place>();
        for (const p of results) {
          if (!p) continue;
          if (dedup.has(p.id)) continue;
          dedup.set(p.id, p);
        }

        const finalPlaces = Array.from(dedup.values()).slice(0, 3);
        if (finalPlaces.length === 0) {
          throw new Error("No Places results for Gemini suggestions.");
        }

        if (cancelled) return;
        setTrendingPlaces(finalPlaces);
        setTrendingState("done");
      } catch (e: any) {
        if (cancelled) return;
        console.warn("Gemini trending failed; falling back", e);
        setTrendingPlaces([]);
        setTrendingState("error");
        setTrendingError(e?.message ? String(e.message) : "Trending failed");
      }
    };

    // Refresh when start location changes.
    refreshTrending();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    myTrip?.[0]?.id,
    myTrip?.[0]?.loc,
    myTrip?.[0]?.lat,
    myTrip?.[0]?.lng,
    recentlyViewed?.[0]?.id,
    recentlyViewed?.[0]?.loc,
    recentlyViewed?.[0]?.lat,
    recentlyViewed?.[0]?.lng,
    locale,
    trendingRefreshNonce,
  ]);

  const handleStartPlaceSelect = (googlePlace: any) => {
    if (!googlePlace.geometry || !googlePlace.geometry.location) return;

    const newPlace: Place = {
      id: googlePlace.place_id || "start-location-" + Date.now(),
      name: googlePlace.name || googlePlace.formatted_address,
      loc: googlePlace.formatted_address || "Custom Location",
      lat: googlePlace.geometry.location.lat(),
      lng: googlePlace.geometry.location.lng(),
      rating: googlePlace.rating || 0,
      img: IMAGES.MAP_VIEW_THUMB,
      tag: "Start",
      type: "Location",
    };

    setMyTrip((prev) => {
      const copy = [...prev];
      if (copy.length > 0) copy[0] = newPlace;
      else copy.push(newPlace);
      return copy;
    });
  };

  const replaceTripPlaceAtIndex = (index: number, newPlace: Place) => {
    if (index < 0) return;
    if (index >= myTrip.length) return;

    const duplicate = myTrip.some(
      (p, i) => i !== index && p.id === newPlace.id,
    );
    if (duplicate) {
      alert(l("这个地点已在行程中。", "This place is already in your trip."));
      return;
    }

    setMyTrip((prev) => {
      const copy = [...prev];
      copy[index] = newPlace;
      return copy;
    });
    setEditingIndex(null);
  };

  const handleDestPlaceSelect = (googlePlace: any) => {
    if (!googlePlace.geometry || !googlePlace.geometry.location) return;

    if (myTrip.length >= 10) {
      alert(l("最多只能添加 10 个地点。", "Maximum of 10 stops allowed."));
      return;
    }

    const openingHours = extractOpeningHoursFromLegacyShim(googlePlace);
    const placeTypes = Array.isArray(googlePlace.types)
      ? googlePlace.types
      : [];

    const newPlace: Place = {
      id: googlePlace.place_id || Math.random().toString(),
      name: googlePlace.name || googlePlace.formatted_address,
      loc: googlePlace.formatted_address || "Unknown location",
      lat: googlePlace.geometry.location.lat(),
      lng: googlePlace.geometry.location.lng(),
      rating: googlePlace.rating || 4.5,
      placeTypes,
      openingHours,
      priceLevel:
        typeof googlePlace.price_level === "number"
          ? googlePlace.price_level
          : undefined,
      tips: getPlaceTips({
        name: googlePlace.name || googlePlace.formatted_address,
        loc: googlePlace.formatted_address || "",
        type: "Destination",
        placeTypes,
        openingHours,
        priceLevel:
          typeof googlePlace.price_level === "number"
            ? googlePlace.price_level
            : undefined,
      }),
      img:
        googlePlace.photos && googlePlace.photos.length > 0
          ? googlePlace.photos[0].getUrl({ maxWidth: 400 })
          : IMAGES.MAP_VIEW_THUMB,
      tag: "Custom",
      type: "Destination",
    };
    pushRecentlyViewed(newPlace);
    onAddPlace(newPlace);
  };

  const handleAddDestinationFromTag = async (input: {
    label: string;
    query: string;
  }) => {
    if (myTrip.length >= 10) {
      setTagAddError(l("最多只能添加 10 个地点", "You can add up to 10 stops"));
      window.setTimeout(() => setTagAddError(null), 2500);
      return;
    }

    try {
      setTagAddError(null);
      const place = await searchPlaceByTextQuery({ textQuery: input.query });
      if (!place) {
        setDestSearchValue(input.query);
        setTagAddError(
          l(
            "没找到具体地点，已填入搜索框供你选择",
            "No exact match found. I put it into the search box for you to pick.",
          ),
        );
        window.setTimeout(() => setTagAddError(null), 2500);
        return;
      }

      // Reuse the same mapping used by Gemini trending suggestions.
      const asText = (v: any): string => {
        if (typeof v === "string") return v;
        if (v && typeof v === "object") {
          if (typeof (v as any).text === "string") return (v as any).text;
          if (typeof (v as any).name === "string") return (v as any).name;
        }
        return v == null ? "" : String(v);
      };

      const photoShim = place.photos
        ? place.photos.map((p: any) => ({
            getUrl: (options: any) => p.getURI(options),
          }))
        : [];

      const extractedHours = extractOpeningHoursFromNewPlace(place);
      const openingFromNew = extractedHours
        ? {
            open_now: extractedHours.openNow,
            weekday_text: extractedHours.weekdayText,
          }
        : undefined;

      const legacyShim = {
        place_id: place.id,
        name: asText(place.displayName) || asText(place.formattedAddress),
        formatted_address: asText(place.formattedAddress),
        rating: place.rating,
        types: place.types || (place.primaryType ? [place.primaryType] : []),
        price_level:
          typeof place.priceLevel === "number"
            ? place.priceLevel
            : typeof place.price_level === "number"
              ? place.price_level
              : undefined,
        opening_hours: openingFromNew,
        geometry: { location: place.location },
        photos: photoShim,
      };

      handleDestPlaceSelect(legacyShim);
      setDestSearchValue("");
    } catch (e) {
      console.warn("Add destination from tag failed", e);
      setDestSearchValue(input.query);
      setTagAddError(
        l(
          "添加失败，已填入搜索框供你选择",
          "Add failed. I put it into the search box for you to pick.",
        ),
      );
      window.setTimeout(() => setTagAddError(null), 2500);
    }
  };

  const handleNearbySearch = (
    placeName: string,
    type: "food" | "attraction",
  ) => {
    const query =
      type === "food"
        ? l(`附近的餐厅 ${placeName}`, `Restaurants near ${placeName}`)
        : l(`附近的景点 ${placeName}`, `Attractions near ${placeName}`);

    setDestSearchValue(query);
    setOpenNearbyMenuId(null);

    // Provide visual feedback or scroll if needed
    // For now assuming the search bar is visible or user notices the change.
    // If on mobile where sidebar is below, might need scrolling.
    const searchInput = document.querySelector(
      'input[placeholder*="Add destination"]',
    );
    if (searchInput) {
      searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
      (searchInput as HTMLElement).focus();
    }
  };

  const handleClearAll = () => {
    if (
      window.confirm(
        l("确定要清空行程吗？", "Are you sure you want to clear all?"),
      )
    ) {
      setMyTrip([]);
    }
  };

  const handleEditPlaceSelect = (index: number) => (googlePlace: any) => {
    if (!googlePlace.geometry || !googlePlace.geometry.location) return;

    if (index === 0) {
      const newPlace: Place = {
        id: googlePlace.place_id || "start-location-" + Date.now(),
        name: googlePlace.name || googlePlace.formatted_address,
        loc: googlePlace.formatted_address || "Custom Location",
        lat: googlePlace.geometry.location.lat(),
        lng: googlePlace.geometry.location.lng(),
        rating: googlePlace.rating || 0,
        img: IMAGES.MAP_VIEW_THUMB,
        tag: "Start",
        type: "Location",
      };
      pushRecentlyViewed(newPlace);
      replaceTripPlaceAtIndex(0, newPlace);
      return;
    }

    const openingHours = extractOpeningHoursFromLegacyShim(googlePlace);
    const placeTypes = Array.isArray(googlePlace.types)
      ? googlePlace.types
      : [];

    const newPlace: Place = {
      id: googlePlace.place_id || Math.random().toString(),
      name: googlePlace.name || googlePlace.formatted_address,
      loc: googlePlace.formatted_address || "Unknown location",
      lat: googlePlace.geometry.location.lat(),
      lng: googlePlace.geometry.location.lng(),
      rating: googlePlace.rating || 4.5,
      placeTypes,
      openingHours,
      priceLevel:
        typeof googlePlace.price_level === "number"
          ? googlePlace.price_level
          : undefined,
      tips: getPlaceTips({
        name: googlePlace.name || googlePlace.formatted_address,
        loc: googlePlace.formatted_address || "",
        type: "Destination",
        placeTypes,
        openingHours,
        priceLevel:
          typeof googlePlace.price_level === "number"
            ? googlePlace.price_level
            : undefined,
      }),
      img:
        googlePlace.photos && googlePlace.photos.length > 0
          ? googlePlace.photos[0].getUrl({ maxWidth: 400 })
          : IMAGES.MAP_VIEW_THUMB,
      tag: "Custom",
      type: "Destination",
    };
    pushRecentlyViewed(newPlace);
    replaceTripPlaceAtIndex(index, newPlace);
  };

  const handleUseCurrentLocation = (silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) setLocError("Geolocation not supported.");
      return;
    }

    setIsLocating(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPlace: Place = {
          id: "current-location-" + Date.now(),
          name: "My Current Location",
          loc: "Current Position",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          rating: 5,
          img: IMAGES.MAP_VIEW_THUMB,
          tag: "Start",
          type: "Location",
        };

        pushRecentlyViewed(newPlace);

        setMyTrip((prev) => {
          const copy = [...prev];
          if (copy.length > 0) copy[0] = newPlace;
          else copy.push(newPlace);
          return copy;
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn("Geolocation failed or denied.", err);
        setIsLocating(false);

        if (!silent) {
          const fallbackPlace: Place = {
            id: "current-location-simulated",
            name: "Tokyo Station (Simulated)",
            loc: "Chiyoda City, Tokyo, Japan",
            lat: 35.6812,
            lng: 139.7671,
            rating: 5,
            img: IMAGES.MAP_VIEW_THUMB,
            tag: "Start",
            type: "Location",
          };

          pushRecentlyViewed(fallbackPlace);

          setMyTrip((prev) => {
            const copy = [...prev];
            if (copy.length > 0) copy[0] = fallbackPlace;
            else copy.push(fallbackPlace);
            return copy;
          });

          setLocError(
            l(
              "定位权限被拒绝，已使用模拟位置。",
              "Location access denied. Using simulated location.",
            ),
          );
          setTimeout(() => setLocError(null), 4000);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      },
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 relative">
        <div className="absolute inset-0 bg-white dark:bg-slate-900 md:bg-white/90 md:dark:bg-slate-900/90 md:backdrop-blur-md pointer-events-none"></div>
        <div className="relative px-4 md:px-10 max-w-[1440px] mx-auto h-16 flex items-center justify-between">
          <div
            className="flex items-center text-slate-900 dark:text-white cursor-pointer"
            onClick={() => onNavigate("home")}
            aria-label="TripPilot"
            title="TripPilot"
          >
            <div className="h-10 w-[189px] md:h-12 md:w-[227px]">
              {inlineLogoSvg ? (
                <span
                  className="block h-full w-full"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: inlineLogoSvg }}
                />
              ) : (
                <img
                  src="/icon-prd-2.svg?v=20260202"
                  alt="TripPilot"
                  className="h-full w-full object-contain block"
                  draggable={false}
                />
              )}
            </div>
          </div>
          <div className="flex items-center gap-8">
            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => onNavigate("summary")}
                className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors text-sm font-medium"
              >
                {l("我的行程", "My Trips")}
              </button>
              <button
                onClick={() => onNavigate("community")}
                className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors text-sm font-medium"
              >
                {l("社区", "Community")}
              </button>
              <button
                onClick={() => onNavigate("map")}
                className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors text-sm font-medium"
              >
                {l("探索", "Explore")}
              </button>
            </nav>

            {user ? (
              <button
                type="button"
                onClick={openAuth}
                className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover bg-center border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden flex items-center justify-center text-slate-700 dark:text-slate-200 font-extrabold"
                title={l(`已登录：${user.name}`, `Signed in: ${user.name}`)}
              >
                <span className="text-sm">
                  {user.name.trim().slice(0, 1).toUpperCase()}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={openAuth}
                className="h-10 px-3 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors text-sm font-semibold"
                title={l("登录", "Login")}
                aria-label={l("登录", "Login")}
              >
                <Icon name="login" className="text-[18px]" />
                <span>{l("登录", "Login")}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[1440px] mx-auto px-4 md:px-10 pb-12">
        {/* API Config Banner */}
        {showConfigBanner && (
          <div className="mt-6 mb-2 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex items-start gap-3 text-red-700 dark:text-red-200">
                <Icon name="warning" className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">
                    {l("需要配置", "Setup Required")}
                  </p>
                  <p className="text-sm mt-1 opacity-90">{configMessage}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hero */}
        <section className="relative rounded-3xl overflow-hidden mt-6 bg-slate-900 shadow-xl isolate min-h-[420px] md:min-h-[520px] flex flex-col items-center justify-start md:justify-center">
          <div className="absolute inset-0 -z-10">
            <img
              alt={l("旅行背景", "Travel background")}
              className="w-full h-full object-cover object-[50%_78%] md:object-[50%_68%] opacity-90 filter brightness-110 contrast-105 saturate-110"
              src={IMAGES.HOME_HERO}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-black/10"></div>
          </div>

          <div className="flex flex-col items-center justify-center py-7 md:py-10 px-4 text-center w-full max-w-4xl">
            <h1 className="text-white text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 drop-shadow-md">
              TripPilot
            </h1>
            <p className="text-slate-100 text-lg md:text-xl max-w-2xl mb-6 md:mb-10 font-medium drop-shadow-sm">
              {l(
                "从想法到路线，一键可执行",
                "From idea to itinerary, ready to go",
              )}
            </p>

            <div className="w-full max-w-5xl mb-6">
              <p className="text-xs font-extrabold tracking-wider text-white/80 mb-3">
                {l(
                  "它和其他旅行 App / 通用聊天机器人有什么不同？",
                  "What makes it different?",
                )}
              </p>
              <div className="md:grid md:grid-cols-3 md:gap-3 text-left">
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 md:hidden snap-x snap-mandatory">
                  <div className="min-w-[260px] snap-start rounded-2xl bg-black/35 backdrop-blur-md ring-1 ring-white/15 p-4 shadow-lg">
                    <div className="flex items-center gap-2 text-white">
                      <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/10">
                        <IconRound name="schedule" />
                      </div>
                      <p className="font-extrabold">
                        {l("现实约束规划", "Reality-aware planning")}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-snug text-white/90">
                      {l(
                        "会考虑天气/营业时间/距离，让安排更可行。",
                        "Considers weather, opening hours, and distance to keep plans feasible.",
                      )}
                    </p>
                  </div>

                  <div className="min-w-[260px] snap-start rounded-2xl bg-black/35 backdrop-blur-md ring-1 ring-white/15 p-4 shadow-lg">
                    <div className="flex items-center gap-2 text-white">
                      <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/10">
                        <IconRound name="auto_awesome" />
                      </div>
                      <p className="font-extrabold">
                        {l("不是只会聊天", "Not just a chatbot")}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-snug text-white/90">
                      {l(
                        "给出可点击添加的具体地点，直接变成你的行程。",
                        "Returns specific places you can click to add — not vague advice.",
                      )}
                    </p>
                  </div>

                  <div className="min-w-[260px] snap-start rounded-2xl bg-black/35 backdrop-blur-md ring-1 ring-white/15 p-4 shadow-lg">
                    <div className="flex items-center gap-2 text-white">
                      <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/10">
                        <IconRound name="map" />
                      </div>
                      <p className="font-extrabold">
                        {l("路线对比与优化", "Route comparison & optimization")}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-snug text-white/90">
                      {l(
                        "一键生成并对比驾车/步行/公共交通路线。",
                        "Generate and compare driving, walking, and transit routes in one click.",
                      )}
                    </p>
                  </div>
                </div>

                <div className="hidden md:block rounded-2xl bg-black/35 backdrop-blur-md ring-1 ring-white/15 p-4 shadow-lg">
                  <div className="flex items-center gap-2 text-white">
                    <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/10">
                      <IconRound name="schedule" />
                    </div>
                    <p className="font-extrabold">
                      {l("现实约束规划", "Reality-aware planning")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-snug text-white/90">
                    {l(
                      "会考虑天气/营业时间/距离，让安排更可行。",
                      "Considers weather, opening hours, and distance to keep plans feasible.",
                    )}
                  </p>
                </div>

                <div className="hidden md:block rounded-2xl bg-black/35 backdrop-blur-md ring-1 ring-white/15 p-4 shadow-lg">
                  <div className="flex items-center gap-2 text-white">
                    <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/10">
                      <IconRound name="auto_awesome" />
                    </div>
                    <p className="font-extrabold">
                      {l("不是只会聊天", "Not just a chatbot")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-snug text-white/90">
                    {l(
                      "给出可点击添加的具体地点，直接变成你的行程。",
                      "Returns specific places you can click to add — not vague advice.",
                    )}
                  </p>
                </div>

                <div className="hidden md:block rounded-2xl bg-black/35 backdrop-blur-md ring-1 ring-white/15 p-4 shadow-lg">
                  <div className="flex items-center gap-2 text-white">
                    <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/10">
                      <IconRound name="map" />
                    </div>
                    <p className="font-extrabold">
                      {l("路线对比与优化", "Route comparison & optimization")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-snug text-white/90">
                    {l(
                      "一键生成并对比驾车/步行/公共交通路线。",
                      "Generate and compare driving, walking, and transit routes in one click.",
                    )}
                  </p>
                </div>
              </div>
            </div>

            {showWelcome ? (
              <div className="w-full max-w-3xl mb-4 md:mb-6">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 md:p-5 shadow-2xl ring-1 ring-black/5 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white">
                        {l("新手引导", "Onboarding")}
                        <span className="ml-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                          {onboardingStep + 1}/3
                        </span>
                      </p>

                      <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                        {onboardingStep === 0
                          ? l("粘贴想法", "Paste your idea")
                          : onboardingStep === 1
                            ? l("添加地点", "Add places")
                            : l("生成路线", "Generate route")}
                      </p>

                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                        {onboardingStep === 0
                          ? l(
                              "把旅行想法粘贴到下方的“对话/计划”里，点击结果即可添加到行程。",
                              "Paste your trip idea into “Chat/Plan” below — click results to add to your trip.",
                            )
                          : onboardingStep === 1
                            ? l(
                                "先输入出发地，再添加至少 1 个目的地。",
                                "Add a start location, then at least 1 destination.",
                              )
                            : l(
                                "点击“优化并规划”生成并对比路线。",
                                "Click “Optimize & Plan” to generate and compare routes.",
                              )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={dismissWelcome}
                      className="shrink-0 h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-600 dark:text-slate-200 flex items-center justify-center"
                      aria-label={l("关闭引导", "Dismiss")}
                      title={l("关闭引导", "Dismiss")}
                    >
                      <Icon name="close" className="text-[18px]" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {[0, 1, 2].map((idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setOnboardingStep(idx as 0 | 1 | 2)}
                          className={`h-2.5 w-2.5 rounded-full transition-colors ${
                            onboardingStep === idx
                              ? "bg-primary"
                              : "bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
                          }`}
                          aria-label={l(
                            `跳转到第 ${idx + 1} 步`,
                            `Go to step ${idx + 1}`,
                          )}
                          title={l(
                            `跳转到第 ${idx + 1} 步`,
                            `Go to step ${idx + 1}`,
                          )}
                        />
                      ))}
                    </div>

                    {welcomeToast ? (
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        {welcomeToast}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      {onboardingStep === 0 ? (
                        <button
                          type="button"
                          onClick={copySamplePrompt}
                          className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-extrabold hover:bg-primary/90 transition-colors"
                        >
                          {l("复制示例文案", "Copy a sample prompt")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={goPrevOnboardingStep}
                          className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-extrabold hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        >
                          {l("上一步", "Back")}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (onboardingStep === 2) {
                            dismissWelcome();
                            return;
                          }
                          goNextOnboardingStep();
                        }}
                        className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-extrabold hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      >
                        {onboardingStep === 2
                          ? l("完成", "Done")
                          : l("下一步", "Next")}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={dismissWelcome}
                      className="text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      {l("跳过引导", "Skip")}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {shouldShowCommunityNudge ? (
              <div className="w-full max-w-3xl mb-4 md:mb-6">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 md:p-4 shadow-2xl ring-1 ring-black/5 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <IconRound name="groups" />
                        </span>
                        {l("社区精选", "Community picks")}
                      </p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                        {l(
                          "看看别人发布的行程，一键复用到你的路线。",
                          "See what others planned — reuse in one click.",
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={dismissCommunityNudge}
                      className="shrink-0 h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-600 dark:text-slate-200 flex items-center justify-center"
                      aria-label={l("不再提示", "Don't show again")}
                      title={l("不再提示", "Don't show again")}
                    >
                      <Icon name="close" className="text-[18px]" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    {communityPreviewState === "loading" ? (
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {l("加载中…", "Loading...")}
                      </div>
                    ) : communityPreview.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {communityPreview.map((it) => (
                          <div
                            key={it.id}
                            className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate"
                            title={it.title}
                          >
                            • {it.title}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {l(
                          "还没有公开行程？去发布第一条吧。",
                          "No community trips yet — publish the first one.",
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onNavigate("community")}
                        className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-extrabold hover:bg-primary/90 transition-colors"
                      >
                        {l("去社区逛逛", "Browse Community")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          dismissCommunityNudge();
                          onNavigate("community");
                        }}
                        className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-extrabold hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      >
                        {l("发布我的行程", "Publish mine")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Trip Configurator Panel */}
            <div
              id="trip-configurator"
              className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 md:p-6 shadow-2xl ring-1 ring-black/5 flex flex-col gap-4 text-left"
            >
              {/* Departure Time */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <IconRound name="schedule" className="text-slate-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {l("出发时间", "Departure")}
                  </span>
                </div>
                <input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="text-right text-sm font-bold text-slate-900 dark:text-white bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 shadow-sm hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-text"
                />
              </div>

              <div
                id="onboarding-step-idea"
                className={
                  isOnboardingStep(0)
                    ? "rounded-2xl ring-2 ring-primary/70 ring-offset-2 ring-offset-white/70 dark:ring-offset-slate-900/70"
                    : ""
                }
              >
                <ItineraryPlannerChatbot
                  onPickPlace={(p) => {
                    void handleAddDestinationFromTag({
                      label: p.label,
                      query: p.query,
                    });
                  }}
                />
              </div>
              {tagAddError && (
                <div className="text-xs text-amber-700 dark:text-amber-200 font-bold">
                  {tagAddError}
                </div>
              )}

              <div
                id="onboarding-step-places"
                className={`flex flex-col gap-3 relative ${
                  isOnboardingStep(1)
                    ? "rounded-2xl ring-2 ring-primary/70 ring-offset-2 ring-offset-white/70 dark:ring-offset-slate-900/70"
                    : ""
                }`}
              >
                {/* Connector Line */}
                <div className="absolute left-[19px] top-8 bottom-8 w-[2px] bg-slate-200 dark:bg-slate-700 z-0"></div>

                {/* START LOCATION (Index 0) */}
                <div className="relative z-10 group">
                  {myTrip.length > 0 ? (
                    <div className="flex flex-col gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 transition-all hover:shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-primary shadow-sm shrink-0">
                          <IconRound name="my_location" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-blue-600 dark:text-blue-300 uppercase tracking-wider">
                            {l("出发地", "Start Location")}
                          </p>
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {myTrip[0].name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                            {l(
                              "提示：建议填写城市或具体地点；不支持航班路线。",
                              "Tip: Use a city or specific place; flights aren't supported.",
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => setEditingIndex(0)}
                          className="p-1.5 text-slate-400 hover:text-primary rounded-full hover:bg-white dark:hover:bg-slate-800 transition-colors"
                          title={l("编辑出发地", "Edit start")}
                        >
                          <IconRound name="edit" className="text-lg" />
                        </button>
                        <button
                          onClick={() => onRemovePlace(myTrip[0].id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-colors"
                          title={l("删除出发地", "Remove start")}
                        >
                          <IconRound name="close" className="text-lg" />
                        </button>
                      </div>

                      {editingIndex === 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <PlaceSearch
                              onPlaceSelect={handleEditPlaceSelect(0)}
                              placeholder={l(
                                "编辑出发地…",
                                "Edit start location...",
                              )}
                              className="shadow-sm"
                            />
                          </div>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="px-3 py-2 bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-xl transition-colors font-bold text-sm"
                          >
                            {l("取消", "Cancel")}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <PlaceSearch
                          onPlaceSelect={handleStartPlaceSelect}
                          placeholder={l(
                            "输入出发地…",
                            "Enter start location...",
                          )}
                          className="shadow-sm"
                        />
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          {l(
                            "提示：建议填写城市或具体地点；不支持航班路线。",
                            "Tip: Use a city or specific place; flights aren't supported.",
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUseCurrentLocation(false)}
                        disabled={isLocating}
                        className="px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors flex items-center justify-center gap-2 font-bold text-sm whitespace-nowrap"
                      >
                        {isLocating ? (
                          <IconRound name="sync" className="animate-spin" />
                        ) : (
                          <IconRound name="my_location" />
                        )}
                        <span className="hidden sm:inline">
                          {l("我的位置", "My location")}
                        </span>
                      </button>
                    </div>
                  )}
                  {locError && (
                    <div className="text-xs text-amber-600 mt-1 pl-1 font-bold">
                      {locError}
                    </div>
                  )}
                </div>

                {/* DESTINATIONS (Index 1...N) */}
                {myTrip.slice(1).map((place, i) => (
                  <div
                    key={place.id}
                    className="relative z-10 flex items-center gap-3 bg-white dark:bg-slate-800 p-2 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md animate-in slide-in-from-top-2 duration-300"
                  >
                    <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm shrink-0 font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {formatStopLabel(i + 1)}
                      </p>
                      {editingIndex === i + 1 ? (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1">
                            <PlaceSearch
                              onPlaceSelect={handleEditPlaceSelect(i + 1)}
                              placeholder={formatEditStopPlaceholder(i + 1)}
                              className="shadow-sm"
                            />
                          </div>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-xl transition-colors font-bold text-sm"
                          >
                            {l("取消", "Cancel")}
                          </button>
                        </div>
                      ) : (
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {place.name}
                        </p>
                      )}
                      {(() => {
                        const rec = getRecommendedStay(place);
                        if (!rec) return null;
                        return (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                            {l("建议停留：", "Suggested time: ")}
                            {formatStayMinutes(rec.minutes)}
                          </p>
                        );
                      })()}
                      {(() => {
                        const summary = formatOpeningHoursSummary(
                          place.openingHours,
                        );
                        if (!summary) return null;
                        return (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                            {l("开放时间：", "Hours: ")}
                            {summary}
                          </p>
                        );
                      })()}
                      {(() => {
                        const ticket = formatTicketSummary(place);
                        if (!ticket) return null;
                        return (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                            {ticket}
                          </p>
                        );
                      })()}
                      {(() => {
                        const spend = formatSpendSummary({
                          priceLevel: place.priceLevel,
                          placeTypes: place.placeTypes,
                        });
                        if (!spend) return null;
                        return (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                            {spend}
                          </p>
                        );
                      })()}
                      {(() => {
                        const summary = formatTipsSummary(place.tips, {
                          maxItems: 4,
                        });
                        if (!summary) return null;
                        return (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium whitespace-normal break-words">
                            {l("注意：", "Tips: ")}
                            {summary}
                          </p>
                        );
                      })()}
                    </div>
                    <button
                      onClick={() => setEditingIndex(i + 1)}
                      className="p-1.5 text-slate-400 hover:text-primary rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title={l("编辑地点", "Edit stop")}
                    >
                      <IconRound name="edit" className="text-lg" />
                    </button>
                    <button
                      onClick={() => onRemovePlace(place.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title={l("移除地点", "Remove stop")}
                    >
                      <IconRound name="close" className="text-lg" />
                    </button>
                  </div>
                ))}

                {/* ADD NEW DESTINATION INPUT */}
                {myTrip.length < 10 && (
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="size-10 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-600 shrink-0">
                      <IconRound name="add" />
                    </div>
                    <div className="flex-1">
                      <PlaceSearch
                        onPlaceSelect={handleDestPlaceSelect}
                        value={destSearchValue}
                        onValueChange={setDestSearchValue}
                        focusOnValueChange
                        placeholder={
                          myTrip.length === 0
                            ? l(
                                "添加目的地…（请先设置出发地）",
                                "Add destination... (set a start location first)",
                              )
                            : l("添加目的地…", "Add destination...")
                        }
                        className="shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => onNavigate(myTrip.length > 1 ? "route" : "map")}
                disabled={myTrip.length < 2}
                id="onboarding-step-generate"
                className={`font-bold py-3 px-8 rounded-full transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
                  myTrip.length > 1
                    ? "bg-primary hover:bg-primary/90 text-white hover:shadow-primary/50"
                    : "bg-slate-700/50 text-slate-400 cursor-not-allowed"
                } ${
                  isOnboardingStep(2)
                    ? "ring-2 ring-primary/70 ring-offset-2 ring-offset-slate-900/20"
                    : ""
                }`}
              >
                <IconRound name="auto_awesome" />
                {myTrip.length > 1
                  ? l("优化并规划", "Optimize & Plan")
                  : l("至少添加 2 个地点", "Add at least 2 places")}
              </button>
            </div>
          </div>
        </section>

        {/* Content Grid */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 flex flex-col gap-10">
            {/* Trending */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Icon
                    name="local_fire_department"
                    className="text-amber-500 filled"
                  />
                  {l("热门推荐", "Trending Attractions")}
                </h2>
                <div className="flex items-center gap-3">
                  {trendingState === "loading" && (
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <IconRound name="sync" className="animate-spin" />
                      {l("Gemini 生成中…", "Generating with Gemini...")}
                    </span>
                  )}
                  <button
                    onClick={() => onNavigate("map")}
                    className="text-primary hover:text-primary/80 text-sm font-semibold hover:underline"
                  >
                    {l("查看全部", "View all")}
                  </button>
                </div>
              </div>
              {trendingState === "error" && trendingError && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3">
                    <span>
                      {l(
                        "Gemini 推荐不可用：",
                        "Gemini suggestions unavailable: ",
                      )}
                      {getTrendingErrorHint(trendingError)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTrendingRefreshNonce((n) => n + 1)}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      title={l("重试 Gemini 推荐", "Retry Gemini suggestions")}
                    >
                      {l("重试", "Retry")}
                    </button>
                  </div>
                  <details className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <summary className="cursor-pointer select-none">
                      {l("查看错误详情", "View error details")}
                    </summary>
                    <div className="mt-1 whitespace-pre-wrap break-words">
                      {trendingError}
                    </div>
                  </details>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {trendingPlaces.length === 0 ? (
                  <div className="col-span-full text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 rounded-xl p-4">
                    {trendingState === "loading"
                      ? l("Gemini 正在生成推荐…", "Generating with Gemini...")
                      : l(
                          "暂无推荐（请先设置起点，或点击重试）",
                          "No suggestions yet (set a start location or retry).",
                        )}
                  </div>
                ) : (
                  trendingPlaces.map((item) => {
                    const normalizeCategory = (raw?: string | null): string => {
                      const c = (raw || "").trim();
                      if (!c) return "";
                      if (c === "历史古迹" || c === "Historic site")
                        return l("历史古迹", "Historic site");
                      if (c === "地标建筑" || c === "Landmark")
                        return l("地标建筑", "Landmark");
                      if (c === "博物馆" || c === "Museum")
                        return l("博物馆", "Museum");
                      if (c === "美术馆" || c === "Art gallery")
                        return l("美术馆", "Art gallery");
                      if (c === "自然风景" || c === "Nature")
                        return l("自然风景", "Nature");
                      if (c === "公园" || c === "Park")
                        return l("公园", "Park");
                      if (c === "街区/步行街" || c === "Street / walk")
                        return l("街区/步行街", "Street / walk");
                      if (c === "美食" || c === "Food")
                        return l("美食", "Food");
                      if (c === "购物" || c === "Shopping")
                        return l("购物", "Shopping");
                      if (c === "夜景" || c === "Night view")
                        return l("夜景", "Night view");
                      if (c === "休闲" || c === "Relaxation")
                        return l("休闲", "Relaxation");

                      return c;
                    };

                    const isAdded = myTrip.some((p) => p.id === item.id);

                    const typeLabel = (() => {
                      if (item.category && item.category.trim().length > 0)
                        return normalizeCategory(item.category);
                      const t = new Set(
                        (item.placeTypes || []).map((x) => String(x)),
                      );
                      if (t.has("museum")) return l("博物馆", "Museum");
                      if (t.has("art_gallery"))
                        return l("美术馆", "Art gallery");
                      if (t.has("tourist_attraction"))
                        return l("景点", "Attraction");
                      if (t.has("park")) return l("公园", "Park");
                      if (t.has("natural_feature"))
                        return l("自然风景", "Nature");
                      if (
                        t.has("place_of_worship") ||
                        t.has("church") ||
                        t.has("mosque") ||
                        t.has("synagogue")
                      )
                        return l("宗教场所", "Place of worship");
                      if (t.has("shopping_mall") || t.has("department_store"))
                        return l("购物", "Shopping");
                      if (
                        t.has("restaurant") ||
                        t.has("cafe") ||
                        t.has("bakery")
                      )
                        return l("美食", "Food");

                      // Fallback to curated 'type' field if it looks like "Historic • 2h".
                      const s = String(item.type || "");
                      const beforeDot = s.includes("•") ? s.split("•")[0] : s;
                      const v = beforeDot.trim();
                      return v && v.length <= 14 ? v : null;
                    })();

                    const stay = (() => {
                      const rec = getRecommendedStay(item);
                      return rec
                        ? `${l("建议游玩：", "Suggested time: ")}${formatStayMinutes(
                            rec.minutes,
                          )}`
                        : null;
                    })();

                    const opening = (() => {
                      const summary = formatOpeningHoursSummary(
                        item.openingHours,
                      );
                      return summary
                        ? `${l("营业时间：", "Hours: ")}${summary}`
                        : null;
                    })();

                    const ticket = (() => {
                      // Uses heuristics + optional curated numeric price.
                      return formatTicketSummary(item);
                    })();

                    const spend = (() => {
                      return formatSpendSummary({
                        priceLevel: item.priceLevel,
                        placeTypes: item.placeTypes,
                      });
                    })();

                    return (
                      <div
                        key={item.id}
                        className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-slate-700 flex flex-col h-full"
                      >
                        <div className="relative h-48 overflow-hidden shrink-0">
                          <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 shadow-sm z-10">
                            {item.tag}
                          </div>
                          <div
                            className="h-full w-full bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                            style={{ backgroundImage: `url(${item.img})` }}
                          ></div>
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1">
                                {item.name}
                              </h3>
                              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                                <Icon
                                  name="location_on"
                                  className="text-[14px]"
                                />
                                {item.loc}
                              </div>
                              {item.description && (
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                  {l("推荐理由：", "Why: ")}
                                  {item.description}
                                </div>
                              )}

                              <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {typeLabel && (
                                  <div>
                                    {l("景点类型：", "Category: ")}
                                    {typeLabel}
                                  </div>
                                )}
                                {opening && <div>{opening}</div>}
                                {ticket && <div>{ticket}</div>}
                                {spend && <div>{spend}</div>}
                                {stay && <div>{stay}</div>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded text-xs font-bold">
                              <span>{item.rating}</span>
                              <Icon
                                name="star"
                                className="text-[12px] filled"
                              />
                            </div>
                          </div>
                          <div className="mt-auto pt-4">
                            {isAdded ? (
                              <button
                                onClick={() => onRemovePlace(item.id)}
                                className="w-full py-2.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-green-200 dark:border-green-800"
                              >
                                <Icon name="check" className="text-[20px]" />
                                {l("已添加", "Added")}
                              </button>
                            ) : (
                              <button
                                onClick={() => onAddPlace(item)}
                                className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-primary hover:text-white text-slate-700 dark:text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                              >
                                <Icon
                                  name="add_circle"
                                  className="text-[20px]"
                                />
                                {l("加入行程", "Add to Trip")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recently Viewed */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Icon name="history" className="text-primary" />
                {l("最近浏览", "Recently Viewed")}
              </h2>
              {recentlyViewed.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                  {l(
                    "暂无最近浏览记录。试试搜索并添加一个地点。",
                    "No recently viewed places yet. Try searching and adding a place.",
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {recentlyViewed.map((item) => {
                    const isAdded = myTrip.some((p) => p.id === item.id);
                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:shadow-md transition-shadow"
                      >
                        <div
                          className="w-20 h-20 rounded-lg bg-cover bg-center shrink-0"
                          style={{ backgroundImage: `url(${item.img})` }}
                        ></div>
                        <div className="flex-grow">
                          <h4 className="font-bold text-slate-900 dark:text-white text-lg">
                            {item.name}
                          </h4>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {item.loc}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            isAdded ? onRemovePlace(item.id) : onAddPlace(item)
                          }
                          className={`p-3 rounded-lg transition-colors ${isAdded ? "bg-green-100 text-green-600" : "bg-primary/10 hover:bg-primary text-primary hover:text-white"}`}
                        >
                          <Icon name={isAdded ? "check" : "add"} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white">
                    {l("你的行程", "Your Trip")}
                  </h3>
                  <div className="flex items-center gap-2">
                    {myTrip.length > 0 && (
                      <button
                        onClick={handleClearAll}
                        className="text-slate-400 hover:text-red-500 text-xs font-bold px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        {l("清空", "Clear all")}
                      </button>
                    )}
                    <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
                      {formatPlacesCountLabel(myTrip.length)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-5 flex flex-col gap-4 max-h-[400px] lg:max-h-[60vh] overflow-y-auto custom-scrollbar">
                {myTrip.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Icon name="map" className="text-4xl mb-2 opacity-50" />
                    <p>{l("还没有添加地点。", "No places added yet.")}</p>
                    <p className="text-xs mt-1">
                      {l(
                        "先在上方添加一个地点作为起点。",
                        "Start by adding a location above.",
                      )}
                    </p>
                  </div>
                ) : (
                  myTrip.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex gap-3 group animate-in fade-in slide-in-from-right-4 duration-300"
                    >
                      <div
                        className="w-16 h-16 rounded-lg bg-cover bg-center shrink-0 relative"
                        style={{ backgroundImage: `url(${item.img})` }}
                      >
                        <div className="absolute top-0 left-0 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-br-lg rounded-tl-lg">
                          {index === 0 ? l("起点", "Start") : index}
                        </div>
                      </div>
                      <div className="flex flex-col justify-center flex-grow min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.loc.split(",")[0]}
                        </p>
                      </div>

                      <div className="relative self-center">
                        <button
                          onClick={() =>
                            setOpenNearbyMenuId(
                              openNearbyMenuId === item.id ? null : item.id,
                            )
                          }
                          className={`p-1 rounded-full transition-all ${
                            openNearbyMenuId === item.id
                              ? "text-primary bg-primary/10"
                              : "text-slate-300 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-900/20"
                          }`}
                          title={l("周边探索", "Explore Nearby")}
                        >
                          <Icon name="travel_explore" className="text-[20px]" />
                        </button>
                        {openNearbyMenuId === item.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenNearbyMenuId(null)}
                            />
                            <div
                              className={`absolute right-0 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
                                index >= myTrip.length - 2
                                  ? "bottom-full mb-2 origin-bottom-right"
                                  : "top-full mt-2 origin-top-right"
                              }`}
                            >
                              <div className="p-1">
                                <button
                                  onClick={() =>
                                    handleNearbySearch(item.name, "food")
                                  }
                                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
                                >
                                  <IconRound
                                    name="restaurant"
                                    className="text-[16px] text-orange-500"
                                  />
                                  {l("搜美食", "Find Food")}
                                </button>
                                <button
                                  onClick={() =>
                                    handleNearbySearch(item.name, "attraction")
                                  }
                                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
                                >
                                  <IconRound
                                    name="attractions"
                                    className="text-[16px] text-purple-500"
                                  />
                                  {l("搜景点", "Attractions")}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => setEditingIndex(index)}
                        className="text-slate-300 hover:text-primary self-center p-1 rounded-full hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-all"
                        title={l("编辑", "Edit")}
                      >
                        <Icon name="edit" className="text-[20px]" />
                      </button>
                      <button
                        onClick={() => onRemovePlace(item.id)}
                        className="text-slate-300 hover:text-red-500 self-center p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        title={l("移除", "Remove")}
                      >
                        <Icon name="cancel" className="text-[20px]" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="p-5 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                <div className="flex justify-between text-sm mb-4 text-slate-500 dark:text-slate-400">
                  <span>{l("预计时长", "Est. Duration")}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatTripDurationLabel(tripDuration)}
                  </span>
                </div>
                <button
                  onClick={() =>
                    onNavigate(myTrip.length > 1 ? "route" : "map")
                  }
                  className={`w-full font-bold py-3.5 px-4 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                    myTrip.length > 1
                      ? "bg-primary hover:bg-blue-600 text-white shadow-blue-500/20"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {myTrip.length > 1
                    ? l("优化并生成路线", "Optimize & Plan")
                    : l("至少添加 2 个地点", "Add at least 2 places")}
                  <Icon name="auto_awesome" className="text-[20px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
