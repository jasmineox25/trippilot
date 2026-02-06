import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ViewState, TravelMode } from "../../App";
import { IconRound } from "../Icon";
import { useI18n } from "../../i18n/react";
import { useAuth } from "../../contexts/AuthContext";
import type { Place } from "../../data";
import {
  listCommunityTrips,
  type CommunityTripV1,
  unpublishCommunityTrip,
} from "../../services/firebase/communityTrips";
import { decodeSharePayload } from "../../utils/shareLink";
import { restoreTripFromSharePayload } from "../../utils/restoreFromShare";
import { loadGoogleMaps } from "../../services/googleMaps";

declare const google: any;

interface CommunityViewProps {
  onNavigate: (view: ViewState) => void;
  setMyTrip: React.Dispatch<React.SetStateAction<Place[]>>;
  setTravelMode: (mode: TravelMode) => void;
  setDepartureTime: (time: string) => void;
  setRouteResult: (result: any[]) => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({
  onNavigate,
  setMyTrip,
  setTravelMode,
  setDepartureTime,
  setRouteResult,
}) => {
  const { l, locale } = useI18n();
  const { user, openAuth } = useAuth();

  const [items, setItems] = useState<CommunityTripV1[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [routeTitleById, setRouteTitleById] = useState<Record<string, string>>(
    {},
  );

  const placesServiceRef = useRef<any>(null);
  const placeInfoCacheRef = useRef<
    Map<string, { name?: string; city?: string }>
  >(new Map());

  const localeTag = useMemo(() => {
    const map: Record<string, string> = {
      en: "en-US",
      zh: "zh-CN",
      ja: "ja-JP",
      ko: "ko-KR",
      fr: "fr-FR",
      es: "es-ES",
      de: "de-DE",
      pt: "pt-PT",
      ru: "ru-RU",
    };
    return map[locale] || locale;
  }, [locale]);

  const formatUpdated = (ms: number) => {
    try {
      const d = new Date(ms || 0);
      if (!Number.isFinite(d.getTime())) return "";
      return d.toLocaleString(localeTag, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const extractCityFromAddressComponents = (components: any): string => {
    try {
      const arr = Array.isArray(components) ? components : [];
      const pick = (type: string) =>
        arr.find((c: any) =>
          Array.isArray(c?.types) ? c.types.includes(type) : false,
        );
      const best =
        pick("locality") ||
        pick("postal_town") ||
        pick("administrative_area_level_2") ||
        pick("administrative_area_level_1");
      const v = String(best?.long_name || best?.short_name || "").trim();
      return v;
    } catch {
      return "";
    }
  };

  const extractCityFromLocString = (loc: string): string => {
    try {
      const parts = String(loc || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 2) return parts[0] || "";
      return "";
    } catch {
      return "";
    }
  };

  const ensurePlacesService = async (): Promise<any | null> => {
    try {
      await loadGoogleMaps({ locale });
      if (!google?.maps?.places?.PlacesService) return null;
      if (!placesServiceRef.current) {
        const div = document.createElement("div");
        placesServiceRef.current = new google.maps.places.PlacesService(div);
      }
      return placesServiceRef.current;
    } catch {
      return null;
    }
  };

  const getPlaceInfo = async (args: {
    placeId: string;
    fallbackName: string;
    fallbackLoc: string;
  }): Promise<{ name: string; city: string }> => {
    const placeId = String(args.placeId || "").trim();
    const fallbackName = String(args.fallbackName || "").trim();
    const fallbackLoc = String(args.fallbackLoc || "").trim();

    const cacheKey = `${locale}:${placeId}`;
    const cached = placeInfoCacheRef.current.get(cacheKey);
    if (cached?.name || cached?.city) {
      return {
        name: String(cached.name || fallbackName || "").trim(),
        city: String(
          cached.city || extractCityFromLocString(fallbackLoc) || "",
        ).trim(),
      };
    }

    const svc = await ensurePlacesService();
    if (!svc || !placeId || placeId.startsWith("current-location")) {
      return {
        name: fallbackName,
        city: extractCityFromLocString(fallbackLoc),
      };
    }

    const info = await new Promise<{ name?: string; city?: string }>((res) => {
      try {
        svc.getDetails(
          {
            placeId,
            fields: ["name", "address_components"],
          },
          (place: any, status: any) => {
            if (status !== "OK" || !place) {
              res({});
              return;
            }
            const name = String(place?.name || "").trim();
            const city = extractCityFromAddressComponents(
              place?.address_components,
            );
            res({ name: name || undefined, city: city || undefined });
          },
        );
      } catch {
        res({});
      }
    });

    placeInfoCacheRef.current.set(cacheKey, info);

    return {
      name: String(info.name || fallbackName || "").trim(),
      city: String(
        info.city || extractCityFromLocString(fallbackLoc) || "",
      ).trim(),
    };
  };

  const load = async () => {
    setState("loading");
    setError(null);
    try {
      const list = await listCommunityTrips({ max: 30 });
      setItems(list);
      setState("idle");
    } catch (e) {
      console.warn("Failed to load community trips", e);
      setError(
        e instanceof Error ? e.message : l("加载失败", "Failed to load"),
      );
      setState("error");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build a locale-aware route summary title for each post, so browsing/searching
  // works across languages (e.g. ローマ should match Rome trips).
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!items || items.length === 0) return;

      const next: Record<string, string> = {};
      for (const it of items.slice(0, 50)) {
        if (cancelled) return;
        if (routeTitleById[it.id]) continue;

        const payload = decodeSharePayload(it.share);
        if (!payload) continue;
        const restored = restoreTripFromSharePayload(payload);
        const trip = restored.myTrip || [];
        if (trip.length < 1) continue;

        const start = trip[0];
        const dest = trip[1] || trip[trip.length - 1];

        const startIsCurrent =
          String(start?.id || "").startsWith("current-location") ||
          String(start?.name || "") === "My Current Location";
        const startFallbackName = String(start?.name || "").trim();
        const startFallbackLoc = String(start?.loc || "").trim();
        const destFallbackName = String(dest?.name || "").trim();
        const destFallbackLoc = String(dest?.loc || "").trim();

        const [startInfo, destInfo] = await Promise.all([
          startIsCurrent
            ? Promise.resolve({ name: l("我的位置", "My location"), city: "" })
            : getPlaceInfo({
                placeId: String(start?.id || ""),
                fallbackName: startFallbackName,
                fallbackLoc: startFallbackLoc,
              }),
          getPlaceInfo({
            placeId: String(dest?.id || ""),
            fallbackName: destFallbackName,
            fallbackLoc: destFallbackLoc,
          }),
        ]);

        const city = String(startInfo.city || destInfo.city || "").trim();
        const startLabel = String(
          startInfo.name || startFallbackName || "",
        ).trim();
        const destLabel = String(
          destInfo.name || destFallbackName || "",
        ).trim();

        if (!startLabel || !destLabel) continue;

        // Ensure city is searchable even if POI names don't include it.
        const base = `${startLabel} → ${destLabel}`;
        const withCity =
          city && !base.toLowerCase().includes(city.toLowerCase())
            ? `${base} · ${city}`
            : base;

        next[it.id] = withCity.slice(0, 140);
      }

      if (!cancelled && Object.keys(next).length > 0) {
        setRouteTitleById((prev) => ({ ...prev, ...next }));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [items, locale, routeTitleById]);

  const onOpenTrip = (item: CommunityTripV1) => {
    try {
      const payload = decodeSharePayload(item.share);
      if (!payload) {
        alert(l("这条分享数据已损坏。", "This shared trip is invalid."));
        return;
      }
      const restored = restoreTripFromSharePayload(payload);
      setMyTrip(restored.myTrip);
      setTravelMode(restored.travelMode as TravelMode);
      setDepartureTime(restored.departureTime);
      setRouteResult([]);
      onNavigate(restored.myTrip.length > 1 ? "route" : "home");
    } catch (e) {
      console.warn("Open community trip failed", e);
      alert(l("打开失败", "Failed to open"));
    }
  };

  const copyShareLink = async (item: CommunityTripV1) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("share", item.share);
      url.hash = "";
      await navigator.clipboard.writeText(url.toString());
      setCopiedId(item.id);
      window.setTimeout(
        () => setCopiedId((prev) => (prev === item.id ? null : prev)),
        1500,
      );
    } catch {
      // Best-effort.
    }
  };

  const deleteTrip = async (item: CommunityTripV1) => {
    if (!user?.id) {
      openAuth();
      return;
    }
    if (item.ownerUid !== user.id) {
      alert(
        l(
          "你没有权限删除这条发布。",
          "You don't have permission to delete this post.",
        ),
      );
      return;
    }

    const ok = window.confirm(
      l("确定删除这条发布吗？", "Delete this community post?"),
    );
    if (!ok) return;

    setDeletingId(item.id);
    try {
      await unpublishCommunityTrip(user.id, item.id);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
      setCopiedId((prev) => (prev === item.id ? null : prev));
    } catch (e) {
      console.warn("Delete community trip failed", e);
      alert(e instanceof Error ? e.message : l("删除失败", "Failed to delete"));
      // Refresh list to stay consistent.
      void load();
    } finally {
      setDeletingId((prev) => (prev === item.id ? null : prev));
    }
  };

  const subtitle = useMemo(() => {
    return l(
      "发布你自己的行程，让其他用户参考。",
      "Publish your trips so others can discover and reuse them.",
    );
  }, [l]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const localizedTitle = routeTitleById[it.id] || "";
      const hay =
        `${localizedTitle} ${it.title || ""} ${it.description || ""} ${it.ownerName || ""}`
          .toLowerCase()
          .trim();
      return hay.includes(q);
    });
  }, [items, search, routeTitleById]);

  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between sm:h-16 items-start sm:items-center py-2 sm:py-0 gap-3 sm:gap-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => onNavigate("home")}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0"
                title={l("返回首页", "Back")}
              >
                <IconRound name="arrow_back" />
              </button>
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg font-bold leading-none text-slate-900 dark:text-white truncate">
                  {l("社区", "Community")}
                </h1>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {subtitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!user?.id) openAuth();
                  else onNavigate("summary");
                }}
                className="flex-1 sm:flex-none justify-center px-3 py-2 rounded-lg text-sm font-bold border transition-colors flex items-center gap-2 bg-white/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800"
              >
                <IconRound name="bookmark" className="text-[18px]" />
                <span className="truncate">{l("我的行程", "My Trips")}</span>
              </button>

              <button
                type="button"
                onClick={load}
                disabled={state === "loading"}
                className={`flex-1 sm:flex-none justify-center px-3 py-2 rounded-lg text-sm font-bold border transition-colors flex items-center gap-2 ${
                  state === "loading"
                    ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                    : "bg-white/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800"
                }`}
              >
                <IconRound
                  name="sync"
                  className={`text-[18px] ${state === "loading" ? "animate-spin" : ""}`}
                />
                <span className="truncate">{l("刷新", "Refresh")}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={l("搜索社区行程...", "Search community trips...")}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/70 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <IconRound name="search" className="text-[18px]" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="px-2 py-1 rounded-lg bg-white/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              {l("共 ", "Total: ")}
              {items.length}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-200 text-sm font-bold">
            {error}
          </div>
        )}

        {state === "loading" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1">
                    <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="mt-2 h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                </div>
                <div className="mt-4 h-12 bg-slate-100 dark:bg-slate-700/40 rounded-xl" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="text-slate-900 dark:text-white font-extrabold">
              {l("还没有公开行程", "No community trips yet")}
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {l(
                "去路线页点击“分享”→“发布到社区”，让大家都能看到。",
                "Go to a route and use Share → Publish to Community.",
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate("home")}
                className="px-4 py-2 rounded-xl text-sm font-extrabold bg-primary hover:bg-blue-600 text-white transition-colors"
              >
                {l("去规划路线", "Plan a route")}
              </button>
              <button
                type="button"
                onClick={() => onNavigate("route")}
                className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              >
                {l("查看我的路线结果", "Go to route results")}
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="text-slate-900 dark:text-white font-extrabold">
              {l("没有匹配的行程", "No matching trips")}
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {l("换个关键词试试。", "Try another keyword.")}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((it) => {
              const owner = (it.ownerName || "").trim();
              const ownerInitial = owner
                ? owner.slice(0, 1).toUpperCase()
                : "?";
              const updated = formatUpdated(it.updatedAtMs || it.createdAtMs);
              const copied = copiedId === it.id;
              const canDelete = Boolean(user?.id) && it.ownerUid === user?.id;
              const deleting = deletingId === it.id;
              const localizedTitle = (routeTitleById[it.id] || "").trim();
              const titleMain = localizedTitle || it.title;
              const showOriginal =
                Boolean(localizedTitle) &&
                String(it.title || "").trim() &&
                String(it.title || "").trim() !== localizedTitle;

              return (
                <div
                  key={it.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                      {ownerInitial}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-slate-900 dark:text-white truncate">
                        {titleMain}
                      </div>
                      {showOriginal ? (
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                          {l("原标题", "Original")}: {it.title}
                        </div>
                      ) : null}
                      {it.description ? (
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                          {it.description}
                        </div>
                      ) : (
                        <div className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                          {l("（无描述）", "(No description)")}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        {owner ? (
                          <span className="truncate">
                            {l("作者", "By")} {owner}
                          </span>
                        ) : null}
                        {updated ? (
                          <span className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
                            {l("更新", "Updated")}: {updated}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenTrip(it)}
                      className="flex-1 px-3 py-2 rounded-xl text-sm font-extrabold bg-primary hover:bg-blue-600 text-white transition-colors"
                    >
                      {l("打开", "Open")}
                    </button>

                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => void deleteTrip(it)}
                        disabled={deleting}
                        className={`px-3 py-2 rounded-xl text-sm font-bold border transition-colors ${
                          deleting
                            ? "opacity-60 cursor-not-allowed border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300"
                            : "border-rose-200 dark:border-rose-800 bg-white/70 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-300"
                        }`}
                        title={l("删除", "Delete")}
                      >
                        <IconRound
                          name="delete"
                          className={`text-[18px] ${deleting ? "animate-pulse" : ""}`}
                        />
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void copyShareLink(it)}
                      className="px-3 py-2 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      title={l("复制可分享链接", "Copy link")}
                    >
                      {copied ? (
                        <span className="text-xs font-extrabold text-primary">
                          {l("已复制", "Copied")}
                        </span>
                      ) : (
                        <IconRound name="share" className="text-[18px]" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
