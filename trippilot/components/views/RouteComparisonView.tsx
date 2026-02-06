import React, { useEffect, useMemo, useRef, useState } from "react";
import { IconRound, Icon } from "../Icon";
import { ViewState, TravelMode } from "../../App";
import { Place } from "../../data";
import {
  calculateRoute,
  fetchOpeningHoursByPlaceId,
  loadGoogleMaps,
} from "../../services/googleMaps";
import { IMAGES } from "../../constants";
import { PlaceSearch } from "../PlaceSearch";
import {
  formatStayMinutes,
  getRecommendedStay,
} from "../../utils/recommendedStay";
import {
  extractOpeningHoursFromLegacyShim,
  formatOpeningHoursSummary,
} from "../../utils/openingHours";
import { formatTipsSummary, getPlaceTips } from "../../utils/placeTips";
import { formatSpendSummary, formatTicketSummary } from "../../utils/cost";
import {
  computeVisitFeasibility,
  summarizeVisitFeasibility,
} from "../../utils/visitFeasibility";
import { getBusinessHoursForDate } from "../../utils/businessHours";
import { applyGeminiReorder } from "../../utils/geminiActions";
import { runGeminiReasoning } from "../../services/aiOrchestrator";
import type { ConstraintSnapshot } from "../../services/gemini/schema";
import {
  buildGoogleMapsNavigationUrl,
  buildSharePayloadFromState,
  buildShareUrl,
} from "../../utils/shareLink";
import {
  buildGoogleCalendarEventUrl,
  buildRouteIcs,
  downloadIcsFile,
} from "../../utils/calendarExport";
import { useAuth } from "../../contexts/AuthContext";
import { saveRoutePlan } from "../../services/firebase/routePlans";
import {
  publishCommunityTrip,
  unpublishCommunityTrip,
} from "../../services/firebase/communityTrips";
import { useI18n } from "../../i18n/react";
import {
  fetchWeatherNow,
  formatWeatherBrief,
  type WeatherNow,
} from "../../utils/weather";

declare const google: any;

interface RouteComparisonViewProps {
  onNavigate: (view: ViewState) => void;
  travelMode: TravelMode;
  setTravelMode: (mode: TravelMode) => void;
  myTrip: Place[];
  setMyTrip: React.Dispatch<React.SetStateAction<Place[]>>;
  setRouteResult: (result: any[]) => void;
  routeResult: any[];
  departureTime: string; // Passed from App
  setDepartureTime: (time: string) => void;
}

type RunSummary = {
  atMs: number;
  stops: number;
  durationSec: number;
  distanceMeters: number;
  orderKey: string;
};

type OrderExplainMeta = {
  inputOrderKey: string;
  travelTimeOptimizedKey: string;
  finalOrderKey: string;
  hadTimingIssues: boolean;
  usedBusinessHoursHeuristic: boolean;
  usedGeminiSuggestion: boolean;
  travelMode: TravelMode;
  departureTime: string;
  placeNames: string[];
};

import {
  estimateTripBudget,
  type BudgetEstimateResponse,
} from "../../services/gemini/budget";

const BudgetEstimateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  places: Place[];
}> = ({ isOpen, onClose, places }) => {
  const { l, locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BudgetEstimateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !data && !loading) {
      setLoading(true);
      setError(null);
      estimateTripBudget(places, locale)
        .then(setData)
        .catch((e) => {
          console.error(e);
          setError(l("估算失败，请重试", "Estimation failed, please retry"));
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, places, data, loading, l, locale]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col ring-1 ring-white/10 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-primary">
            <IconRound name="payments" className="text-xl" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              {l("预算估算 (AI)", "Budget Estimate (AI)")}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500"
          >
            <IconRound name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
                {l("正在分析门票与物价...", "Analyzing tickets & prices...")}
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="inline-flex p-3 rounded-full bg-rose-100 text-rose-600 mb-3">
                <IconRound name="error" className="text-2xl" />
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-bold mb-4">
                {error}
              </p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  estimateTripBudget(places, locale)
                    .then(setData)
                    .catch((e) =>
                      setError(
                        l(
                          "估算失败，请重试",
                          "Estimation failed, please retry",
                        ),
                      ),
                    )
                    .finally(() => setLoading(false));
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
              >
                {l("重试", "Retry")}
              </button>
            </div>
          ) : data ? (
            <div className="space-y-6">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                  {l(
                    "预估总花费 (不含大交通/住宿)",
                    "Estimated Total (Excl. flights/hotels)",
                  )}
                </p>
                <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300">
                  {data.totalRange}{" "}
                  <span className="text-lg">{data.currency}</span>
                </div>
                <p className="text-sm mt-2 font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <IconRound name="restaurant" className="text-base" />
                  {l("日均食宿交通参考：", "Daily food/transport: ")}
                  {data.dailyCostPerPerson}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                  <IconRound name="local_activity" className="text-slate-400" />
                  {l("门票与分项详情", "Tickets & Breakdown")}
                </h4>
                <div className="space-y-2">
                  {data.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {item.name}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <span className="block font-mono font-bold text-slate-700 dark:text-slate-300">
                          {item.estimatedCost === "0"
                            ? l("免费", "Free")
                            : `${item.estimatedCost}`}
                        </span>
                        {item.estimatedCost !== "0" && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            {data.currency}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg leading-relaxed">
                <IconRound
                  name="info"
                  className="inline text-sm mr-1 align-sub"
                />
                {data.disclaimer ||
                  l(
                    "以上价格仅供参考，实际价格可能随季节或政策变动。",
                    "Prices are estimates only and may vary by season or policy.",
                  )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const RouteComparisonView: React.FC<RouteComparisonViewProps> = ({
  onNavigate,
  travelMode,
  setTravelMode,
  myTrip,
  setMyTrip,
  setRouteResult,
  routeResult,
  departureTime,
  setDepartureTime,
}) => {
  const { user, openAuth } = useAuth();
  const { l, lf, locale } = useI18n();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const renderersRef = useRef<any[]>([]);
  const markersRef = useRef<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [isBudgetOpen, setBudgetOpen] = useState(false);

  useEffect(() => {
    if (myTrip.length > 0) {
      const p = myTrip[0];
      fetchWeatherNow(p.lat, p.lng)
        .then(setWeather)
        .catch(() => setWeather(null));
    }
  }, [myTrip]);
  const [error, setError] = useState<string | null>(null);
  const [optimizationNotice, setOptimizationNotice] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [recomputeNonce, setRecomputeNonce] = useState(0);
  const [runHistory, setRunHistory] = useState<{
    prev: RunSummary | null;
    current: RunSummary | null;
  }>({ prev: null, current: null });
  const [orderExplainOpen, setOrderExplainOpen] = useState(false);
  const [orderExplainMeta, setOrderExplainMeta] =
    useState<OrderExplainMeta | null>(null);
  const lastCalcKeyRef = useRef<string | null>(null);
  const lastCalcNonceRef = useRef<number>(-1);
  const [shareState, setShareState] = useState<
    "idle" | "copying" | "copied" | "error"
  >("idle");
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [publishState, setPublishState] = useState<
    "idle" | "publishing" | "published" | "error"
  >("idle");
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [publishToastOpen, setPublishToastOpen] = useState(false);

  const [savePlanState, setSavePlanState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [savePlanSource, setSavePlanSource] = useState<
    null | "cloud" | "local"
  >(null);
  const [savePlanError, setSavePlanError] = useState<string | null>(null);

  const getRouteTitle = useMemo(() => {
    const normalizePlaceName = (place: Place | undefined): string => {
      const raw = String(place?.name || "").trim();
      if (!raw) return "";
      if (
        place?.id?.startsWith("current-location") ||
        raw === "My Current Location"
      ) {
        return l("我的位置", "My location");
      }
      return raw;
    };

    const names = myTrip.map((p) => normalizePlaceName(p)).filter(Boolean);
    if (names.length === 0) return l("行程", "Trip");

    const maxLen = 80;
    const sep = " → ";
    const titleParts: string[] = [names[0]];

    for (let i = 1; i < names.length; i++) {
      const candidate = `${titleParts.join(sep)}${sep}${names[i]}`;
      if (candidate.length <= maxLen) {
        titleParts.push(names[i]);
        continue;
      }

      const remaining = names.length - i;
      const suffix = `… (+${remaining})`;
      const base = titleParts.join(sep);
      const available = maxLen - suffix.length;
      return (
        (available > 0 ? base.slice(0, available) : base.slice(0, maxLen)) +
        suffix
      );
    }

    return titleParts.join(sep).slice(0, maxLen);
  }, [l, myTrip]);

  const parseDepartureDate = (): Date => {
    const raw = String(departureTime || "");
    const d = raw ? new Date(raw) : new Date();
    return Number.isFinite(d.getTime()) ? d : new Date();
  };

  const computeEndTime = (start: Date): Date => {
    const legs = routeResult || [];
    let cursor = new Date(start);
    const safeLegCount = Math.max(
      0,
      Math.min(legs.length, Math.max(0, myTrip.length - 1)),
    );

    for (let i = 0; i < myTrip.length; i++) {
      if (i === 0) continue;

      const legRes = legs[i - 1];
      const idx = Number(legRes?.preferredRouteIndex || 0);
      const leg = legRes?.routes?.[idx]?.legs?.[0];
      const travelSec =
        i - 1 < safeLegCount ? Number(leg?.duration?.value || 0) : 0;
      if (Number.isFinite(travelSec) && travelSec > 0) {
        cursor = new Date(cursor.getTime() + travelSec * 1000);
      }

      const stayMin = (() => {
        try {
          const rec = getRecommendedStay(myTrip[i]);
          const m = Number(rec?.minutes || 0);
          if (Number.isFinite(m) && m > 0) return Math.round(m);
        } catch {
          // ignore
        }
        return 60;
      })();

      cursor = new Date(cursor.getTime() + stayMin * 60 * 1000);
    }

    // Avoid Google Calendar rejecting zero-duration events.
    if (cursor.getTime() <= start.getTime()) {
      return new Date(start.getTime() + 60 * 60 * 1000);
    }

    return cursor;
  };

  const handleDownloadIcs = () => {
    if (!myTrip || myTrip.length < 2) return;
    const { ics, filename } = buildRouteIcs({
      places: myTrip,
      legs: routeResult,
      departureTime,
      title: getRouteTitle,
    });
    downloadIcsFile({ ics, filename });
  };

  const handleOpenGoogleCalendar = () => {
    if (!myTrip || myTrip.length < 2) return;

    const start = parseDepartureDate();
    const end = computeEndTime(start);

    const timeFmt = new Intl.DateTimeFormat(locale || undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const fmtTime = (d: Date) => timeFmt.format(d);

    const shareUrl = (() => {
      try {
        const payload = buildSharePayloadFromState({
          myTrip,
          departureTime,
          travelMode,
        });
        return buildShareUrl(payload);
      } catch {
        return "";
      }
    })();

    const details = (() => {
      const lines: string[] = [];

      lines.push(`${l("出发时间", "Departure")}: ${start.toLocaleString()}`);
      lines.push(`${l("出行方式", "Mode")}: ${travelMode}`);

      if (shareUrl) {
        lines.push("");
        lines.push(`${l("行程链接", "Trip link")}: ${shareUrl}`);
      }

      lines.push("");
      lines.push(l("时间表", "Schedule"));

      let cursor = new Date(start);
      const legs = routeResult || [];
      const safeLegCount = Math.max(
        0,
        Math.min(legs.length, Math.max(0, myTrip.length - 1)),
      );

      for (let i = 1; i < myTrip.length; i++) {
        const from = myTrip[i - 1];
        const to = myTrip[i];

        // Travel window
        const legRes = legs[i - 1];
        const idx = Number(legRes?.preferredRouteIndex || 0);
        const leg = legRes?.routes?.[idx]?.legs?.[0];
        const travelSec =
          i - 1 < safeLegCount ? Number(leg?.duration?.value || 0) : 0;
        if (Number.isFinite(travelSec) && travelSec > 0) {
          const travelStart = new Date(cursor);
          const travelEnd = new Date(cursor.getTime() + travelSec * 1000);
          cursor = new Date(travelEnd);

          const mins = Math.max(1, Math.round(travelSec / 60));
          lines.push(
            `${fmtTime(travelStart)}-${fmtTime(travelEnd)} ${l("交通", "Travel")}: ${from.name} → ${to.name} (${mins}${l("分钟", "m")})`,
          );
        }

        // Visit window
        const stayMin = (() => {
          try {
            const rec = getRecommendedStay(to);
            const m = Number(rec?.minutes || 0);
            if (Number.isFinite(m) && m > 0) return Math.round(m);
          } catch {
            // ignore
          }
          return 60;
        })();

        const visitStart = new Date(cursor);
        const visitEnd = new Date(cursor.getTime() + stayMin * 60 * 1000);
        cursor = new Date(visitEnd);

        const loc = String(to?.loc || "").trim();
        lines.push(
          `${fmtTime(visitStart)}-${fmtTime(visitEnd)} ${l("游玩", "Visit")}: ${to.name}${loc ? ` (${loc})` : ""}`,
        );
      }

      return lines.join("\n");
    })();

    const location = (() => {
      const last = myTrip[myTrip.length - 1];
      return String(last?.loc || "").trim() || undefined;
    })();

    const url = buildGoogleCalendarEventUrl({
      title: getRouteTitle,
      details,
      location,
      start,
      end,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShare = async () => {
    try {
      setShareState("copying");
      const payload = buildSharePayloadFromState({
        myTrip,
        departureTime,
        travelMode,
      });
      const url = buildShareUrl(payload);
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 2500);
    } catch (e) {
      console.warn("Share failed", e);
      setShareState("error");
      window.setTimeout(() => setShareState("idle"), 2500);
    }
  };

  const handleOpenMaps = () => {
    const url = buildGoogleMapsNavigationUrl(myTrip, travelMode);
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handlePublishToCommunity = async () => {
    try {
      if (!user?.id) {
        openAuth();
        return;
      }

      if (!myTrip || myTrip.length < 2) {
        alert(
          l(
            "请先至少添加 1 个出发地和 1 个目的地。",
            "Please add at least a start and one destination first.",
          ),
        );
        return;
      }

      const defaultTitle = (() => {
        const normalizePlaceName = (place: Place | undefined): string => {
          const raw = String(place?.name || "").trim();
          if (!raw) return "";
          if (
            place?.id?.startsWith("current-location") ||
            raw === "My Current Location"
          ) {
            return l("我的位置", "My location");
          }
          return raw;
        };

        const names = myTrip.map((p) => normalizePlaceName(p)).filter(Boolean);
        if (names.length === 0) return l("行程", "Trip");

        const maxLen = 80;
        const sep = " → ";
        const prefix = names[0];
        const titleParts: string[] = [prefix];

        // Try to include all stops; if too long, include as many as possible
        // then append an unambiguous suffix.
        for (let i = 1; i < names.length; i++) {
          const candidate = `${titleParts.join(sep)}${sep}${names[i]}`;
          if (candidate.length <= maxLen) {
            titleParts.push(names[i]);
            continue;
          }

          const remaining = names.length - i;
          const suffix = `… (+${remaining})`;
          const base = titleParts.join(sep);
          const available = maxLen - suffix.length;
          return (
            (available > 0 ? base.slice(0, available) : base.slice(0, maxLen)) +
            suffix
          );
        }

        return titleParts.join(sep).slice(0, maxLen);
      })();

      const title = String(
        window.prompt(l("发布标题：", "Publish title:"), defaultTitle) || "",
      )
        .trim()
        .slice(0, 80);
      if (!title) return;

      const description = String(
        window.prompt(
          l(
            "可选：写一句行程亮点（对外公开）",
            "Optional: add a short public description",
          ),
          "",
        ) || "",
      )
        .trim()
        .slice(0, 280);

      setPublishState("publishing");
      const payload = buildSharePayloadFromState({
        myTrip,
        departureTime,
        travelMode,
      });
      const shareEncoded = (() => {
        try {
          const url = new URL(buildShareUrl(payload));
          return String(url.searchParams.get("share") || "");
        } catch {
          return "";
        }
      })();

      const { id } = await publishCommunityTrip(user.id, {
        title,
        description: description || undefined,
        share: shareEncoded,
        ownerName: user?.name,
      });
      setPublishedId(id);
      setPublishState("published");
      window.setTimeout(() => setPublishState("idle"), 2500);
    } catch (e) {
      console.warn("Publish to community failed", e);
      setPublishState("error");
      const msg =
        e instanceof Error ? e.message : l("发布失败", "Publish failed");
      alert(msg);
      window.setTimeout(() => setPublishState("idle"), 2500);
    }
  };

  const handleUnpublish = async () => {
    try {
      if (!user?.id || !publishedId) return;
      const ok = window.confirm(
        l("确定要从社区取消发布吗？", "Unpublish this from Community?"),
      );
      if (!ok) return;
      await unpublishCommunityTrip(user.id, publishedId);
      setPublishedId(null);
      setPublishState("idle");
    } catch (e) {
      console.warn("Unpublish failed", e);
      alert(e instanceof Error ? e.message : l("失败", "Failed"));
    }
  };

  const focusShareMenuItem = (dir: 1 | -1 | 0) => {
    const root = shareMenuRef.current;
    if (!root) return;

    const items = Array.from(
      root.querySelectorAll(
        'button[data-share-menu-item="true"]:not([disabled])',
      ),
    ) as HTMLButtonElement[];
    if (items.length === 0) return;

    const active = document.activeElement as HTMLElement | null;
    const currentIndex = active ? items.findIndex((b) => b === active) : -1;

    const nextIndex = (() => {
      if (dir === 0) return 0;
      if (currentIndex < 0) return dir === 1 ? 0 : items.length - 1;
      return (currentIndex + dir + items.length) % items.length;
    })();

    items[nextIndex]?.focus();
  };

  useEffect(() => {
    if (!shareMenuOpen) return;
    const onDocMouseDown = (ev: MouseEvent) => {
      const el = shareMenuRef.current;
      if (!el) return;
      if (el.contains(ev.target as Node)) return;
      setShareMenuOpen(false);
    };
    window.addEventListener("mousedown", onDocMouseDown);
    return () => window.removeEventListener("mousedown", onDocMouseDown);
  }, [shareMenuOpen]);

  useEffect(() => {
    if (!shareMenuOpen) return;
    const t = window.setTimeout(() => {
      try {
        focusShareMenuItem(0);
      } catch {
        // ignore
      }
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareMenuOpen]);

  useEffect(() => {
    if (publishState !== "published") return;
    setPublishToastOpen(true);
    const t = window.setTimeout(() => setPublishToastOpen(false), 4500);
    return () => window.clearTimeout(t);
  }, [publishState]);

  const handleSavePlan = async () => {
    try {
      if (!user?.id) {
        openAuth();
        return;
      }

      if (!myTrip || myTrip.length === 0) {
        alert(
          l(
            "请先至少添加一个出发地。",
            "Please add at least a start location first.",
          ),
        );
        return;
      }

      const defaultName = (() => {
        const start = myTrip[0]?.name || l("出发地", "Start");
        const end = myTrip[myTrip.length - 1]?.name || l("行程", "Trip");
        return myTrip.length >= 2 ? `${start} → ${end}` : start;
      })();

      const name = String(
        window.prompt(l("保存路线名称：", "Save route name:"), defaultName) ||
          "",
      )
        .trim()
        .slice(0, 80);
      if (!name) return;

      setSavePlanState("saving");
      setSavePlanSource(null);
      setSavePlanError(null);
      const { source } = await saveRoutePlan(user?.id, {
        name,
        myTrip,
        travelMode,
        departureTime,
      });
      setSavePlanSource(source);

      setSavePlanState("saved");
      window.setTimeout(() => setSavePlanState("idle"), 2500);
    } catch (e) {
      console.warn("Save route plan failed", e);
      setSavePlanState("error");
      setSavePlanSource(null);
      const msg =
        e instanceof Error
          ? e.message
          : String(e || l("保存失败", "Save failed"));
      setSavePlanError(msg);
      window.alert(`${l("保存失败：", "Save failed: ")}${msg}`);
      window.setTimeout(() => setSavePlanState("idle"), 2500);
    }
  };

  const isGeminiEnabled =
    String((import.meta as any)?.env?.VITE_ENABLE_GEMINI_REASONING || "") ===
    "true";

  const formatDeltaMinutesZh = (deltaSec: number): string => {
    const minutes = Math.round(deltaSec / 60);
    if (minutes === 0) return l("不变", "No change");
    if (minutes > 0)
      return lf("多 {minutes} 分钟", "+{minutes} min", {
        minutes: Math.abs(minutes),
      });
    return lf("少 {minutes} 分钟", "-{minutes} min", {
      minutes: Math.abs(minutes),
    });
  };

  const formatDeltaKmZh = (deltaMeters: number): string => {
    const km = deltaMeters / 1000;
    const rounded = Math.round(km * 10) / 10;
    if (rounded === 0) return l("不变", "No change");
    const kmAbs = Math.abs(rounded).toFixed(1);
    if (rounded > 0) return lf("多 {km} 公里", "+{km} km", { km: kmAbs });
    return lf("少 {km} 公里", "-{km} km", { km: kmAbs });
  };

  const formatTravelModeZh = (mode: TravelMode): string => {
    switch (mode) {
      case "DRIVING":
        return l("驾车", "Driving");
      case "WALKING":
        return l("步行", "Walking");
      case "TRANSIT":
        return l("公共交通", "Transit");
      default:
        return String(mode);
    }
  };

  const formatStopLabel = (stopIndex1Based: number): string => {
    if (locale.startsWith("zh")) return `第 ${stopIndex1Based} 站`;
    if (locale.startsWith("ja")) return `立ち寄り ${stopIndex1Based}`;
    if (locale.startsWith("ko")) return `경유지 ${stopIndex1Based}`;
    if (locale.startsWith("fr")) return `Étape ${stopIndex1Based}`;
    if (locale.startsWith("es")) return `Parada ${stopIndex1Based}`;
    if (locale.startsWith("de")) return `Stopp ${stopIndex1Based}`;
    if (locale.startsWith("pt")) return `Parada ${stopIndex1Based}`;
    if (locale.startsWith("ru")) return `Остановка ${stopIndex1Based}`;
    return `Stop ${stopIndex1Based}`;
  };

  const formatEditStopPlaceholder = (stopIndex1Based: number): string => {
    if (locale.startsWith("zh")) return `编辑第 ${stopIndex1Based} 站…`;
    if (locale.startsWith("ja")) return `立ち寄り ${stopIndex1Based} を編集...`;
    if (locale.startsWith("ko")) return `${stopIndex1Based}번째 경유지 편집...`;
    if (locale.startsWith("fr"))
      return `Modifier l'étape ${stopIndex1Based}...`;
    if (locale.startsWith("es")) return `Editar parada ${stopIndex1Based}...`;
    if (locale.startsWith("de"))
      return `Stopp ${stopIndex1Based} bearbeiten...`;
    if (locale.startsWith("pt")) return `Editar parada ${stopIndex1Based}...`;
    if (locale.startsWith("ru"))
      return `Редактировать остановку ${stopIndex1Based}...`;
    return `Edit stop ${stopIndex1Based}...`;
  };

  const getOrderExplainConclusion = (meta: OrderExplainMeta): string => {
    // Build a closing-time detail string for places that have known hours.
    const depDate = departureTime ? new Date(departureTime) : new Date();
    const closingDetails: string[] = [];
    for (const p of myTrip.slice(1)) {
      const w = getBusinessHoursForDate(p.openingHours, depDate);
      if (w.status === "ok") {
        const hh = String(Math.floor(w.closeMinutes / 60)).padStart(2, "0");
        const mm = String(w.closeMinutes % 60).padStart(2, "0");
        closingDetails.push(`${p.name} ${l("关门", "closes")} ${hh}:${mm}`);
      } else if (w.status === "closed") {
        closingDetails.push(`${p.name} ${l("今日休息", "closed today")}`);
      }
    }

    const base =
      meta.usedBusinessHoursHeuristic || meta.hadTimingIssues
        ? l(
            "这样通常总用时更短，并尽量避免关门/来不及。",
            "This is usually faster overall, and tries to avoid arriving too late / after closing.",
          )
        : l("这样通常总用时更短。", "This is usually faster overall.");

    if (closingDetails.length > 0) {
      return `${base}\n${closingDetails.join("；")}`;
    }
    return base;
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
    setRouteResult([]);
  };

  const removeTripPlaceAtIndex = (index: number) => {
    setMyTrip((prev) => prev.filter((_, i) => i !== index));
    setEditingIndex(null);
    setRouteResult([]);
  };

  const toStartPlace = (googlePlace: any): Place | null => {
    if (!googlePlace?.geometry?.location) return null;
    return {
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
  };

  const toDestinationPlace = (googlePlace: any): Place | null => {
    if (!googlePlace?.geometry?.location) return null;

    const openingHours = extractOpeningHoursFromLegacyShim(googlePlace);
    const placeTypes = Array.isArray(googlePlace.types)
      ? googlePlace.types
      : [];

    return {
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
  };

  const handleEditPlaceSelect = (index: number) => (googlePlace: any) => {
    const place =
      index === 0 ? toStartPlace(googlePlace) : toDestinationPlace(googlePlace);
    if (!place) return;
    replaceTripPlaceAtIndex(index, place);
  };

  const handleAddDestinationSelect = (googlePlace: any) => {
    if (myTrip.length >= 10) {
      alert(l("最多只能添加 10 个地点。", "Maximum of 10 stops allowed."));
      return;
    }
    const place =
      myTrip.length === 0
        ? toStartPlace(googlePlace)
        : toDestinationPlace(googlePlace);
    if (!place) return;
    if (myTrip.some((p) => p.id === place.id)) {
      alert(l("这个地点已在行程中。", "This place is already in your trip."));
      return;
    }
    setMyTrip((prev) => [...prev, place]);
    setRouteResult([]);
  };

  const computeTimingStats = (places: Place[], legs: any[], depDate: Date) => {
    const timings = computeVisitFeasibility({
      places,
      legs,
      departureTime: depDate,
    });

    const hasIssues = timings.some(
      (t) =>
        t.status === "arrive_after_close" ||
        t.status === "not_enough_time" ||
        t.status === "closed",
    );

    const summary = summarizeVisitFeasibility(timings);
    const closedToday = timings.filter((t) => t.status === "closed");

    const badCount = timings.filter(
      (t) =>
        t.status === "arrive_after_close" ||
        t.status === "not_enough_time" ||
        t.status === "closed",
    ).length;

    const overtimeMinutes = timings
      .filter(
        (t) =>
          t.status === "arrive_after_close" || t.status === "not_enough_time",
      )
      .reduce((acc, t) => acc + (Number(t.overtimeMinutes || 0) || 0), 0);

    const durationSec = legs.reduce((acc: number, legRes: any) => {
      try {
        const idx = (legRes as any).preferredRouteIndex || 0;
        const leg = legRes?.routes?.[idx]?.legs?.[0];
        return acc + (Number(leg?.duration?.value || 0) || 0);
      } catch {
        return acc;
      }
    }, 0);

    return {
      timings,
      hasIssues,
      summary,
      closedToday,
      score: { badCount, overtimeMinutes, durationSec },
    };
  };

  const compareScores = (
    a: { badCount: number; overtimeMinutes: number; durationSec: number },
    b: { badCount: number; overtimeMinutes: number; durationSec: number },
  ): number => {
    if (a.badCount !== b.badCount) return a.badCount - b.badCount;
    if (a.overtimeMinutes !== b.overtimeMinutes)
      return a.overtimeMinutes - b.overtimeMinutes;
    return a.durationSec - b.durationSec;
  };

  const makeCloseTimeSorted = (places: Place[], depDate: Date): Place[] => {
    if (places.length <= 2) return places;
    const start = places[0];
    const rest = places.slice(1);

    const withMeta = rest.map((p, idx) => {
      const window = getBusinessHoursForDate(p.openingHours, depDate);
      const closeMinutes =
        window.status === "ok" ? window.closeMinutes : undefined;
      return { p, idx, closeMinutes };
    });

    withMeta.sort((a, b) => {
      const ac = a.closeMinutes;
      const bc = b.closeMinutes;
      if (ac == null && bc == null) return a.idx - b.idx;
      if (ac == null) return 1;
      if (bc == null) return -1;
      if (ac !== bc) return ac - bc;
      return a.idx - b.idx;
    });

    return [start, ...withMeta.map((x) => x.p)];
  };

  const uniqueOrders = (orders: Place[][]): Place[][] => {
    const seen = new Set<string>();
    const out: Place[][] = [];
    for (const order of orders) {
      const key = order.map((p) => p.id).join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(order);
    }
    return out;
  };

  // applyGeminiReorder moved to utils/geminiActions.ts

  const visitTimings = useMemo(() => {
    try {
      if (!routeResult || routeResult.length === 0) return [];
      if (!myTrip || myTrip.length < 2) return [];
      const depDate = departureTime ? new Date(departureTime) : new Date();
      return computeVisitFeasibility({
        places: myTrip,
        legs: routeResult,
        departureTime: depDate,
      });
    } catch {
      return [];
    }
  }, [departureTime, myTrip, routeResult]);

  const visitTimingById = useMemo(() => {
    const map = new Map<string, (typeof visitTimings)[number]>();
    visitTimings.forEach((t) => map.set(t.placeId, t));
    return map;
  }, [visitTimings]);

  const hasTimingIssues = useMemo(() => {
    return visitTimings.some(
      (t) =>
        t.status === "arrive_after_close" ||
        t.status === "not_enough_time" ||
        t.status === "closed",
    );
  }, [visitTimings]);

  const timingSummary = useMemo(() => {
    return summarizeVisitFeasibility(visitTimings);
  }, [visitTimings]);

  const closedToday = useMemo(() => {
    return visitTimings.filter((t) => t.status === "closed");
  }, [visitTimings]);

  // Check if any leg is a fallback (true error fallback, not just simplified)
  const hasFallback = routeResult.some((r: any) => r.isFallback);

  const getStats = (legsResponses: any[]) => {
    if (!legsResponses || legsResponses.length === 0)
      return { durationStr: "--", distanceStr: "--" };

    let totalDurationSec = 0;
    let totalDistanceMeters = 0;

    legsResponses.forEach((res) => {
      if (res.routes && res.routes.length > 0) {
        const idx = (res as any).preferredRouteIndex || 0;
        const leg = res.routes[idx].legs[0];
        totalDurationSec += leg.duration?.value || 0;
        totalDistanceMeters += leg.distance?.value || 0;
      }
    });

    const hours = Math.floor(totalDurationSec / 3600);
    const mins = Math.floor((totalDurationSec % 3600) / 60);
    const durationStr = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;
    const distanceStr = (totalDistanceMeters / 1000).toFixed(1) + " km";

    return { durationStr, distanceStr };
  };

  const getTotals = (legsResponses: any[]) => {
    let totalDurationSec = 0;
    let totalDistanceMeters = 0;
    (legsResponses || []).forEach((res) => {
      if (res?.routes && res.routes.length > 0) {
        const idx = (res as any).preferredRouteIndex || 0;
        const leg = res.routes[idx].legs[0];
        totalDurationSec += leg.duration?.value || 0;
        totalDistanceMeters += leg.distance?.value || 0;
      }
    });
    return { totalDurationSec, totalDistanceMeters };
  };

  useEffect(() => {
    let isMounted = true;

    const initRoute = async () => {
      if (myTrip.length < 2) {
        setError(l("至少添加 2 个地点。", "Please add at least 2 places."));
        return;
      }

      const calcKey = `${travelMode}|${departureTime}|${myTrip
        .map((p) => p.id)
        .join(",")}`;

      if (
        lastCalcKeyRef.current === calcKey &&
        lastCalcNonceRef.current === recomputeNonce
      ) {
        return;
      }

      setLoading(true);
      setError(null);
      setOptimizationNotice(false);
      setRouteResult([]);

      try {
        await loadGoogleMaps();

        const { Map } = await google.maps.importLibrary("maps");

        if (mapRef.current && !mapInstanceRef.current) {
          mapInstanceRef.current = new Map(mapRef.current, {
            center: { lat: 35.6762, lng: 139.6503 },
            zoom: 12,
            disableDefaultUI: true,
            mapId: "DEMO_MAP_ID", // Required for AdvancedMarkerElement
          });
        }

        const depDate = departureTime ? new Date(departureTime) : new Date();

        // Enrich places that are missing opening hours (best-effort, parallel).
        let tripForCalc = myTrip;
        const needsHours = myTrip.filter(
          (p, i) => i > 0 && !p.openingHours?.weekdayText?.length && p.id,
        );
        if (needsHours.length > 0) {
          const results = await Promise.all(
            needsHours.map((p) => fetchOpeningHoursByPlaceId(p.id)),
          );
          let enriched = false;
          const updated = myTrip.map((p) => {
            const idx = needsHours.indexOf(p);
            if (idx < 0) return p;
            const hours = results[idx];
            if (!hours) return p;
            enriched = true;
            return { ...p, openingHours: hours };
          });
          if (enriched) {
            tripForCalc = updated;
            setMyTrip(updated);
          }
        }

        const inputOrderKey = tripForCalc.map((p) => p.id).join(",");

        // Perform Calculation with Optimization
        const { legs, optimizedPlaces } = await calculateRoute(
          tripForCalc,
          travelMode,
          depDate,
          true,
        );

        const travelTimeOptimizedKey = optimizedPlaces
          .map((p) => p.id)
          .join(",");
        let usedBusinessHoursHeuristic = false;
        let usedGeminiSuggestion = false;

        // --- Business-hours aware reorder (small candidate set; does NOT replace existing optimization) ---
        // If the optimized-by-travel-time order causes timing issues, try a couple of alternative
        // orders (e.g., swap for 2 stops, or sort by earlier closing time) and pick the best.
        let finalPlaces = optimizedPlaces;
        let finalLegs = legs;
        let timingStats = computeTimingStats(finalPlaces, finalLegs, depDate);

        if (timingStats.hasIssues && finalPlaces.length >= 3) {
          const candidates: Place[][] = [];
          candidates.push(finalPlaces);

          // If there are exactly 2 destinations, try swapping them.
          if (finalPlaces.length === 3) {
            candidates.push([finalPlaces[0], finalPlaces[2], finalPlaces[1]]);
          }

          // General heuristic: visit earlier-closing places first.
          candidates.push(makeCloseTimeSorted(finalPlaces, depDate));

          const unique = uniqueOrders(candidates).slice(0, 3);

          let best = {
            places: finalPlaces,
            legs: finalLegs,
            stats: timingStats,
          };

          // Evaluate alternatives (may add a few extra Directions calls; keep it small).
          for (const cand of unique) {
            const res = await calculateRoute(cand, travelMode, depDate, false);
            const stats = computeTimingStats(
              res.optimizedPlaces,
              res.legs,
              depDate,
            );

            if (compareScores(stats.score, best.stats.score) < 0) {
              best = { places: res.optimizedPlaces, legs: res.legs, stats };
            }
          }

          finalPlaces = best.places;
          finalLegs = best.legs;
          timingStats = best.stats;

          if (
            finalPlaces.map((p) => p.id).join(",") !== travelTimeOptimizedKey
          ) {
            usedBusinessHoursHeuristic = true;
          }
        }

        // --- Gemini reasoning layer (optional; does NOT replace the existing optimization) ---

        if (isGeminiEnabled) {
          try {
            const snapshot: ConstraintSnapshot = {
              departureTimeISO: depDate.toISOString(),
              travelMode,
              places: finalPlaces.map((p) => ({
                placeId: p.id,
                name: p.name,
                loc: p.loc,
                lat: p.lat,
                lng: p.lng,
                openingHours: p.openingHours,
                recommendedStayMinutes: getRecommendedStay(p)?.minutes,
                priceLevel: p.priceLevel,
              })),
              feasibility: {
                hasTimingIssues: timingStats.hasIssues,
                minDepartEarlierMinutes:
                  timingStats.summary.minDepartEarlierMinutes,
                closedToday: timingStats.closedToday.map((c) => ({
                  placeId: c.placeId,
                  reason: c.status,
                })),
              },
            };

            const decision = await runGeminiReasoning(snapshot);
            const reorder = decision.suggestedActions?.find(
              (a) => a.type === "reorder",
            );

            const maybeReordered = applyGeminiReorder(
              finalPlaces,
              reorder?.target,
            );

            if (maybeReordered !== finalPlaces) {
              usedGeminiSuggestion = true;
              // Recompute legs to match the Gemini-adjusted itinerary.
              const recalculated = await calculateRoute(
                maybeReordered,
                travelMode,
                depDate,
                false,
              );
              finalPlaces = recalculated.optimizedPlaces;
              finalLegs = recalculated.legs;
            }
          } catch (e) {
            console.warn("Gemini reasoning skipped/failed", e);
          }
        }

        if (isMounted) {
          setRouteResult(finalLegs);

          setOrderExplainMeta({
            inputOrderKey,
            travelTimeOptimizedKey,
            finalOrderKey: finalPlaces.map((p) => p.id).join(","),
            hadTimingIssues: timingStats.hasIssues,
            usedBusinessHoursHeuristic,
            usedGeminiSuggestion,
            travelMode,
            departureTime,
            placeNames: finalPlaces.map((p) => p.name),
          });

          const { totalDurationSec, totalDistanceMeters } =
            getTotals(finalLegs);
          const newRun: RunSummary = {
            atMs: Date.now(),
            stops: finalPlaces.length,
            durationSec: totalDurationSec,
            distanceMeters: totalDistanceMeters,
            orderKey: finalPlaces.map((p) => p.id).join(","),
          };

          setRunHistory((prev) => ({
            prev: prev.current,
            current: newRun,
          }));

          // Detect if order changed
          const originalIds = inputOrderKey;
          const newIds = finalPlaces.map((p) => p.id).join(",");

          if (originalIds !== newIds) {
            setMyTrip(finalPlaces);
            setOptimizationNotice(true);

            // Avoid an immediate re-run due to setMyTrip(finalPlaces).
            const optimizedCalcKey = `${travelMode}|${departureTime}|${newIds}`;
            lastCalcKeyRef.current = optimizedCalcKey;
            lastCalcNonceRef.current = recomputeNonce;
          } else {
            lastCalcKeyRef.current = calcKey;
            lastCalcNonceRef.current = recomputeNonce;
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Route calculation error:", err);
          let msg = err instanceof Error ? err.message : String(err);

          if (msg.includes("REQUEST_DENIED")) {
            msg =
              "API Error (REQUEST_DENIED): Please ensure the 'Directions API' is enabled in your Google Cloud Console for this API Key.";
          } else if (
            msg.includes("Billing") ||
            msg.includes("over query limit")
          ) {
            msg =
              "API Error: Please check your Google Cloud Billing status and Quotas.";
          } else if (
            msg.includes("Script error") ||
            msg.toLowerCase().includes("failed to load")
          ) {
            msg =
              "Connection error: Failed to access Google Maps. Please check your internet connection or API key.";
          }
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Debounce to prevent too many API calls
    const timer = setTimeout(() => {
      initRoute();
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [travelMode, departureTime, myTrip, recomputeNonce]);

  // Map Rendering Effect
  useEffect(() => {
    const renderMapElements = async () => {
      if (!mapInstanceRef.current) return;

      // Load libraries
      const { DirectionsRenderer } = await google.maps.importLibrary("routes");
      const { AdvancedMarkerElement, PinElement } =
        await google.maps.importLibrary("marker");

      // Cleanup
      renderersRef.current.forEach((r) => r.setMap(null));
      renderersRef.current = [];
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      if (!routeResult || routeResult.length === 0) return;

      const bounds = new google.maps.LatLngBounds();

      routeResult.forEach((res) => {
        const routeIdx = (res as any).preferredRouteIndex || 0;
        const isFallback = (res as any).isFallback;

        const renderer = new DirectionsRenderer({
          map: mapInstanceRef.current,
          directions: res,
          routeIndex: routeIdx,
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: {
            // Use green for walking/fallback, blue for transit
            strokeColor:
              travelMode === "WALKING" || isFallback ? "#10b981" : "#0f7ff0",
            strokeWeight: 6,
            strokeOpacity: 0.8,
          },
        });
        renderersRef.current.push(renderer);

        if (res.routes[routeIdx]?.bounds) {
          bounds.union(res.routes[routeIdx].bounds);
        }
      });

      // Add Markers using AdvancedMarkerElement
      myTrip.forEach((place, index) => {
        if (place.lat && place.lng) {
          const isStart = index === 0;
          const label = isStart ? "S" : String(index);

          // Create numbered pin
          const pin = new PinElement({
            glyphText: label, // Start = S, then 1..N for stops
            glyphColor: "white",
            background: isStart ? "#f97316" : "#0f7ff0",
            borderColor: isStart ? "#ea580c" : "#0a58ca",
          });

          const marker = new AdvancedMarkerElement({
            position: { lat: Number(place.lat), lng: Number(place.lng) },
            map: mapInstanceRef.current,
            title: place.name,
            content: pin,
            zIndex: 100,
          });
          markersRef.current.push(marker);
          bounds.extend(marker.position as any);
        }
      });

      if (!bounds.isEmpty()) {
        mapInstanceRef.current.fitBounds(bounds);
      }
    };

    renderMapElements();
  }, [routeResult, travelMode, myTrip]);

  const stats = getStats(routeResult);
  const delta = useMemo(() => {
    if (!runHistory.prev || !runHistory.current) return null;
    const dt = runHistory.current.durationSec - runHistory.prev.durationSec;
    const dd =
      runHistory.current.distanceMeters - runHistory.prev.distanceMeters;
    const ds = runHistory.current.stops - runHistory.prev.stops;
    const orderChanged =
      runHistory.current.orderKey !== runHistory.prev.orderKey;
    return { dt, dd, ds, orderChanged };
  }, [runHistory.current, runHistory.prev]);

  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between sm:h-16 items-start sm:items-center py-2 sm:py-0 gap-2 sm:gap-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => onNavigate("home")}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0"
              >
                <IconRound name="arrow_back" />
              </button>
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg font-bold leading-none text-slate-900 dark:text-white truncate">
                  {l("行程计划", "Trip Plan")}
                </h1>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {l("优化路线", "Optimized Route")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleSavePlan}
                disabled={savePlanState === "saving" || myTrip.length < 1}
                className={`flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all flex items-center gap-2 shadow-sm ${
                  savePlanState === "saved"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : savePlanState === "error"
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-primary hover:bg-blue-600 text-white"
                } ${
                  savePlanState === "saving" || myTrip.length < 1
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:shadow-md active:scale-[0.99]"
                }`}
                title={
                  savePlanState === "error" && savePlanError
                    ? savePlanError
                    : savePlanState === "saved" && savePlanSource === "local"
                      ? l(
                          "已保存在本设备（云端权限被阻止）",
                          "Saved locally on this device (cloud permission blocked)",
                        )
                      : l(
                          "保存这条路线到我的行程",
                          "Save this route to My Trips",
                        )
                }
              >
                <IconRound
                  name={
                    savePlanState === "saved"
                      ? "check"
                      : savePlanState === "error"
                        ? "error"
                        : savePlanState === "saving"
                          ? "sync"
                          : "bookmark"
                  }
                  className={`text-[18px] ${savePlanState === "saving" ? "animate-spin" : ""}`}
                />
                <span className="truncate">
                  {savePlanState === "saved"
                    ? savePlanSource === "local"
                      ? l("已保存（本地）", "Saved (Local)")
                      : l("已保存", "Saved")
                    : savePlanState === "error"
                      ? l("失败", "Failed")
                      : savePlanState === "saving"
                        ? l("保存中", "Saving")
                        : l("保存我的", "Save trip")}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBudgetOpen(true)}
                disabled={myTrip.length < 1}
                className="p-2 rounded-lg text-sm font-bold border transition-colors flex items-center justify-center gap-2 bg-white/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                title={l("AI 预算估算", "AI Budget Estimate")}
              >
                <IconRound name="payments" className="text-[18px]" />
                <span className="hidden sm:inline">{l("预算", "Budget")}</span>
              </button>

              <div className="relative shrink-0" ref={shareMenuRef}>
                <button
                  type="button"
                  onClick={() => setShareMenuOpen((v) => !v)}
                  disabled={myTrip.length < 2}
                  aria-haspopup="menu"
                  aria-expanded={shareMenuOpen}
                  className="px-3 py-2 rounded-lg text-sm font-bold border transition-colors flex items-center gap-2 bg-white/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  title={l("分享与发布", "Share & publish")}
                >
                  <IconRound name="share" className="text-[18px]" />
                  <span className="hidden sm:inline">{l("分享", "Share")}</span>
                  <IconRound name="expand_more" className="text-[18px]" />
                </button>

                {shareMenuOpen && (
                  <div
                    role="menu"
                    aria-label={l("分享与发布", "Share & publish")}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setShareMenuOpen(false);
                        return;
                      }
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        focusShareMenuItem(1);
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        focusShareMenuItem(-1);
                        return;
                      }
                      if (e.key === "Home") {
                        e.preventDefault();
                        focusShareMenuItem(0);
                        return;
                      }
                      if (e.key === "End") {
                        e.preventDefault();
                        // Focus last enabled item
                        const container = shareMenuRef.current;
                        if (container) {
                          const items = Array.from(
                            container.querySelectorAll(
                              'button[data-share-menu-item="true"]',
                            ),
                          ) as HTMLButtonElement[];
                          const enabled = items.filter((el) => !el.disabled);
                          enabled[enabled.length - 1]?.focus();
                        }
                        return;
                      }

                      if (e.key === "Enter" || e.key === " ") {
                        const active =
                          document.activeElement as HTMLElement | null;
                        if (
                          active instanceof HTMLButtonElement &&
                          active.dataset.shareMenuItem === "true" &&
                          !active.disabled
                        ) {
                          e.preventDefault();
                          active.click();
                        }
                      }
                    }}
                    className="absolute right-0 mt-2 w-72 max-w-[90vw] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden max-h-[70vh] overflow-y-auto"
                  >
                    <button
                      type="button"
                      data-share-menu-item="true"
                      role="menuitem"
                      onClick={() => {
                        setShareMenuOpen(false);
                        void handleShare();
                      }}
                      disabled={shareState === "copying" || myTrip.length < 2}
                      className="w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <IconRound
                        name={
                          shareState === "copied"
                            ? "check"
                            : shareState === "error"
                              ? "error"
                              : shareState === "copying"
                                ? "sync"
                                : "content_copy"
                        }
                        className={`text-[18px] ${shareState === "copying" ? "animate-spin" : ""}`}
                      />
                      {shareState === "copied"
                        ? l("已复制链接", "Link copied")
                        : shareState === "error"
                          ? l("复制失败", "Copy failed")
                          : l("复制分享链接", "Copy share link")}
                    </button>

                    <button
                      type="button"
                      data-share-menu-item="true"
                      role="menuitem"
                      onClick={() => {
                        setShareMenuOpen(false);
                        handleOpenMaps();
                      }}
                      disabled={myTrip.length < 2}
                      className="w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <IconRound name="directions" className="text-[18px]" />
                      {l("在 Google 地图打开", "Open in Google Maps")}
                    </button>

                    <div className="h-px bg-slate-100 dark:bg-slate-800" />

                    <button
                      type="button"
                      data-share-menu-item="true"
                      role="menuitem"
                      onClick={() => {
                        setShareMenuOpen(false);
                        handleOpenGoogleCalendar();
                      }}
                      disabled={myTrip.length < 2}
                      className="w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <IconRound name="open_in_new" className="text-[18px]" />
                      {l("添加到 Google 日历", "Add to Google Calendar")}
                    </button>

                    <button
                      type="button"
                      data-share-menu-item="true"
                      role="menuitem"
                      onClick={() => {
                        setShareMenuOpen(false);
                        handleDownloadIcs();
                      }}
                      disabled={myTrip.length < 2}
                      className="w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <IconRound name="event" className="text-[18px]" />
                      {l("导出日历文件（.ics）", "Export calendar (.ics)")}
                    </button>

                    <div className="h-px bg-slate-100 dark:bg-slate-800" />

                    <button
                      type="button"
                      data-share-menu-item="true"
                      role="menuitem"
                      onClick={() => {
                        setShareMenuOpen(false);
                        void handlePublishToCommunity();
                      }}
                      className="w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800 flex items-center gap-2"
                    >
                      <IconRound
                        name={
                          publishState === "published"
                            ? "check"
                            : publishState === "publishing"
                              ? "sync"
                              : publishState === "error"
                                ? "error"
                                : "public"
                        }
                        className={`text-[18px] ${publishState === "publishing" ? "animate-spin" : ""}`}
                      />
                      {publishState === "published"
                        ? l("已发布到社区", "Published")
                        : publishState === "publishing"
                          ? l("发布中…", "Publishing...")
                          : l("发布到社区", "Publish to Community")}
                    </button>

                    {publishedId && user?.id && (
                      <button
                        type="button"
                        data-share-menu-item="true"
                        role="menuitem"
                        onClick={() => {
                          setShareMenuOpen(false);
                          void handleUnpublish();
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800 flex items-center gap-2 text-rose-700 dark:text-rose-300"
                      >
                        <IconRound name="delete" className="text-[18px]" />
                        {l("取消发布", "Unpublish")}
                      </button>
                    )}

                    <button
                      type="button"
                      data-share-menu-item="true"
                      role="menuitem"
                      onClick={() => {
                        setShareMenuOpen(false);
                        onNavigate("community");
                      }}
                      className="w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800 flex items-center gap-2"
                    >
                      <IconRound name="groups" className="text-[18px]" />
                      {l("查看社区", "View Community")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px-80px)] lg:h-[calc(100vh-64px)] overflow-hidden min-h-0">
        {publishToastOpen ? (
          <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 z-[60] md:w-[420px]">
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 shadow-lg px-4 py-3 flex items-start gap-3">
              <div className="mt-0.5">
                <IconRound name="check" className="text-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-extrabold">
                  {l("已发布到社区", "Published to Community")}
                </div>
                <div className="text-xs font-bold opacity-90 mt-0.5">
                  {l(
                    "其他用户现在可以看到并复用你的行程。",
                    "Others can now view and reuse your trip.",
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPublishToastOpen(false);
                      onNavigate("community");
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold"
                  >
                    {l("去社区看看", "View Community")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishToastOpen(false)}
                    className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold hover:bg-white dark:hover:bg-slate-800"
                  >
                    {l("知道了", "Got it")}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPublishToastOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/30 flex items-center justify-center"
                aria-label={l("关闭", "Dismiss")}
              >
                <IconRound name="close" className="text-[18px]" />
              </button>
            </div>
          </div>
        ) : null}

        <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col flex-1 lg:h-full overflow-y-auto bg-background-light dark:bg-background-dark border-r border-slate-200 dark:border-slate-800 min-h-0">
          <div className="p-6 space-y-6">
            {/* Departure time + Recompute */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <IconRound name="schedule" className="text-slate-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 shrink-0">
                    {l("出发时间", "Departure time")}
                  </span>
                </div>
                <input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => {
                    setDepartureTime(e.target.value);
                    setRouteResult([]);
                  }}
                  className="w-full sm:w-auto text-left sm:text-right text-sm font-bold text-slate-900 dark:text-white bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 shadow-sm hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-text"
                />
              </div>

              {weather && typeof weather.temperatureC === "number" && (
                <div className="mt-2 py-2 px-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-700/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
                    <div className="flex items-center gap-2">
                      <IconRound
                        name="weather_mix"
                        className="text-slate-400 text-[20px]"
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {l("当地天气", "Local Weather")}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white pl-7 sm:pl-0">
                      {formatWeatherBrief(weather, locale)}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setRecomputeNonce((n) => n + 1)}
                  disabled={loading || myTrip.length < 2}
                  className={`w-full sm:w-auto px-4 py-2 bg-primary hover:bg-blue-600 text-white shadow-blue-500/20 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    loading || myTrip.length < 2
                      ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600 shadow-none"
                      : "shadow-lg active:scale-95"
                  }`}
                  title={l("重新计算路线", "Recompute routes")}
                >
                  <IconRound
                    name="sync"
                    className={loading ? "animate-spin" : ""}
                  />
                  {l("重新计算", "Recompute")}
                </button>
                {delta && (
                  <div
                    className="text-xs font-bold text-slate-700 dark:text-slate-200 text-right"
                    title={l(
                      "与上一次计算结果相比的变化",
                      "Changes compared to the previous run",
                    )}
                  >
                    <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
                      {l("相比上次计算", "vs previous run")}
                    </div>
                    <div className="mt-1 flex flex-wrap justify-end gap-1.5">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {l("时间：", "Time: ")}
                        {formatDeltaMinutesZh(delta.dt)}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {l("距离：", "Distance: ")}
                        {formatDeltaKmZh(delta.dd)}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {l("地点：", "Stops: ")}
                        {delta.ds === 0
                          ? l("不变", "No change")
                          : delta.ds > 0
                            ? l(`+${delta.ds} 个`, `+${delta.ds}`)
                            : l(`${delta.ds} 个`, `${delta.ds}`)}
                      </span>
                      {delta.orderChanged && (
                        <button
                          type="button"
                          onClick={() => setOrderExplainOpen((v) => !v)}
                          className="inline-flex items-center px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                          title={l("为什么会是这个顺序？", "Why this order?")}
                        >
                          {l(
                            "顺序：已调整（点我看原因）",
                            "Order adjusted (click to see why)",
                          )}
                        </button>
                      )}
                    </div>
                    {orderExplainOpen && orderExplainMeta && (
                      <div className="mt-2 text-left text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                        <div className="font-extrabold">
                          {l("为什么是这个顺序？", "Why this order?")}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {getOrderExplainConclusion(orderExplainMeta)}
                        </div>
                        <div className="mt-2 space-y-1">
                          <div>
                            {l("- 依据：", "- Based on: ")}
                            {formatTravelModeZh(orderExplainMeta.travelMode)}
                            {l(
                              " + 出发时间（路况/班次）估算每段耗时，尽量减少总路程/总用时。",
                              " + departure time (traffic/schedules) to estimate each leg and minimize total distance/time.",
                            )}
                          </div>
                          {orderExplainMeta.usedBusinessHoursHeuristic && (
                            <div>
                              {l(
                                "- 额外考虑：营业时间/建议停留，避免“到了已关门/来不及”。",
                                "- Extra: business hours & suggested stay to avoid arriving after closing.",
                              )}
                            </div>
                          )}
                          {orderExplainMeta.usedGeminiSuggestion && (
                            <div>
                              {l(
                                "- AI 建议：在存在风险时尝试更可行的顺序（仍以地图路段耗时为准）。",
                                "- AI suggestion: try a more feasible order when there are risks (still based on map travel time).",
                              )}
                            </div>
                          )}
                          <div>
                            {l("- 当前顺序：", "- Current order: ")}
                            {orderExplainMeta.placeNames.join(" → ")}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOrderExplainOpen(false)}
                          className="mt-2 text-xs font-bold text-primary hover:underline"
                        >
                          {l("收起", "Collapse")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Trip editor */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {l("行程地点", "Stops")}
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigate("home")}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  {l("回到首页编辑", "Edit in Home")}
                </button>
              </div>

              {myTrip.length === 0 ? (
                <div className="text-sm text-slate-500">
                  {l("还没有地点。", "No stops yet.")}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Start */}
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                          {l("起点", "Start")}
                        </div>
                        <div className="font-bold truncate">
                          {myTrip[0].name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {myTrip[0].loc}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(0)}
                          className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500"
                          title={l("编辑起点", "Edit start")}
                        >
                          <IconRound name="edit" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTripPlaceAtIndex(0)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600"
                          title={l("移除起点", "Remove start")}
                        >
                          <IconRound name="close" />
                        </button>
                      </div>
                    </div>
                    {editingIndex === 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1">
                          <PlaceSearch
                            onPlaceSelect={handleEditPlaceSelect(0)}
                            placeholder={l(
                              "编辑起点…",
                              "Edit start location...",
                            )}
                            className="shadow-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="px-3 py-2 rounded-lg text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          {l("取消", "Cancel")}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Destinations */}
                  {myTrip.slice(1).map((p, i) => {
                    const idx = i + 1;
                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              {formatStopLabel(idx)}
                            </div>
                            <div className="font-bold truncate">{p.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {p.loc}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingIndex(idx)}
                              className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/20 text-slate-500"
                              title={l("编辑", "Edit")}
                            >
                              <IconRound name="edit" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeTripPlaceAtIndex(idx)}
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600"
                              title={l("移除", "Remove")}
                            >
                              <IconRound name="close" />
                            </button>
                          </div>
                        </div>

                        {editingIndex === idx && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1">
                              <PlaceSearch
                                onPlaceSelect={handleEditPlaceSelect(idx)}
                                placeholder={formatEditStopPlaceholder(idx)}
                                className="shadow-sm"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditingIndex(null)}
                              className="px-3 py-2 rounded-lg text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                            >
                              {l("取消", "Cancel")}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {myTrip.length < 10 && (
                    <div className="pt-1">
                      <PlaceSearch
                        onPlaceSelect={handleAddDestinationSelect}
                        placeholder={
                          myTrip.length < 1
                            ? l("输入出发地…", "Enter start location...")
                            : l("添加目的地…", "Add destination...")
                        }
                        className="shadow-sm"
                      />
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {l(
                          "添加/移除地点后路线会自动重新计算。",
                          "Add / remove stops then route recalculates automatically.",
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mode Switcher */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
              {(["TRANSIT", "WALKING", "DRIVING"] as TravelMode[]).map(
                (mode) => (
                  <button
                    key={mode}
                    onClick={() => setTravelMode(mode)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                      travelMode === mode
                        ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <IconRound
                      name={
                        mode === "TRANSIT"
                          ? "train"
                          : mode === "WALKING"
                            ? "directions_walk"
                            : "directions_car"
                      }
                      className="text-[18px]"
                    />
                    {formatTravelModeZh(mode)}
                  </button>
                ),
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                {l("路线结果", "Route Result")}
              </h2>

              {loading && (
                <p className="text-slate-500 flex items-center gap-2 mt-2">
                  <IconRound name="sync" className="animate-spin" />
                  {l(
                    "正在优化并计算路线…",
                    "Optimizing & calculating route...",
                  )}
                </p>
              )}

              {optimizationNotice && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-xl text-green-700 dark:text-green-300 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-2">
                    <IconRound
                      name="auto_awesome"
                      className="shrink-0 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-extrabold">
                        {l("已自动优化顺序", "Order auto-optimized")}
                      </div>
                      <div className="text-xs mt-1 opacity-90">
                        {l(
                          "为了更省时间/更可行，系统可能会调整停靠点顺序。",
                          "To be faster and more feasible, the system may reorder your stops.",
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrderExplainOpen((v) => !v)}
                      className="text-xs font-extrabold text-green-800 dark:text-green-200 hover:underline"
                    >
                      {l("为什么？", "Why?")}
                    </button>
                  </div>
                  {orderExplainOpen && orderExplainMeta && (
                    <div className="mt-3 text-xs text-green-900 dark:text-green-100 bg-white/70 dark:bg-slate-900/30 border border-green-100/60 dark:border-green-900/30 rounded-lg p-3">
                      <div className="font-extrabold">
                        {l("为什么是这个顺序？", "Why this order?")}
                      </div>
                      <div className="mt-1 opacity-90">
                        {getOrderExplainConclusion(orderExplainMeta)}
                      </div>
                      <div className="mt-2 opacity-95">
                        {l("当前顺序：", "Current order: ")}
                        {orderExplainMeta.placeNames.join(" → ")}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {hasTimingIssues && !loading && (
                <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-700 dark:text-rose-300 text-sm font-medium flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                  <IconRound name="warning" className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {l(
                        "可能来不及 / 已关门（目标：尽量都去）",
                        "May be too tight / closed (goal: visit as much as possible)",
                      )}
                    </p>
                    <p className="text-xs mt-1 opacity-90">
                      {l(
                        "按出发时间 + 路段耗时 + 建议停留 + 今日营业时间做了估算。你可以不删点，优先尝试这些调整：",
                        "Estimated using departure time + leg travel time + suggested stay + today's business hours. You can keep all stops and try these tweaks first:",
                      )}
                    </p>

                    {timingSummary.minDepartEarlierMinutes > 0 && (
                      <p className="text-xs mt-2">
                        {lf(
                          "建议：至少提前出发 {minutes} 分钟（可覆盖当前最严重的超时）。",
                          "Suggestion: depart at least {minutes} min earlier (covers the worst overrun).",
                          { minutes: timingSummary.minDepartEarlierMinutes },
                        )}
                      </p>
                    )}

                    {timingSummary.stayReductionSuggestions.length > 0 && (
                      <div className="text-xs mt-1 opacity-95">
                        {timingSummary.stayReductionSuggestions
                          .slice(0, 3)
                          .map((s) => (
                            <p key={s.placeId}>
                              {lf(
                                "建议：将「{placeName}」停留减少约 {minutes} 分钟。",
                                'Suggestion: reduce stay at "{placeName}" by ~{minutes} min.',
                                {
                                  placeName: s.placeName,
                                  minutes: s.reduceByMinutes,
                                },
                              )}
                            </p>
                          ))}
                      </div>
                    )}

                    {closedToday.length > 0 && (
                      <p className="text-xs mt-2 opacity-90">
                        {l(
                          "另外：有地点显示「今日不营业」，提前出发也无法解决；可换日期或改成附近备选。",
                          'Also: some places show "Closed today". Leaving earlier won\'t help; try a different date or nearby alternatives.',
                        )}
                      </p>
                    )}

                    <p className="text-xs mt-2 opacity-80">
                      {l(
                        "小技巧：把“早关门”的点放前面，通常更容易都去。",
                        "Tip: Put earlier-closing places first; it's easier to fit everything.",
                      )}
                    </p>
                  </div>
                </div>
              )}

              {hasFallback && travelMode === "TRANSIT" && !loading && (
                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl text-amber-700 dark:text-amber-400 text-sm font-medium flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                  <IconRound name="warning" className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {l("公共交通不可用", "Transit Unavailable")}
                    </p>
                    <p className="text-xs mt-1">
                      {l(
                        "部分路段未找到公共交通，已自动切换为步行。（例如夜间太晚或偏远地区）",
                        "Some legs were switched to walking because no public transit was found. (e.g. Too late at night or rural area)",
                      )}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-700 dark:text-red-400 text-sm font-medium flex items-start gap-2">
                  <IconRound name="error" className="shrink-0 mt-0.5" />
                  <span className="break-words">{error}</span>
                </div>
              )}

              {!loading && !error && routeResult.length > 0 && (
                <div
                  className={`relative bg-surface-light dark:bg-surface-dark rounded-xl border border-primary ring-2 ring-primary/20 p-5 shadow-sm`}
                >
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                        {stats.durationStr}
                      </h3>
                      <div className="flex flex-col mt-1">
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                          <IconRound name="place" className="text-base" />
                          {stats.distanceStr}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate("timeline")}
                    className="mt-4 w-full py-2 bg-primary hover:bg-blue-600 text-white font-semibold rounded-lg text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    {l("查看完整步骤", "View Full Steps")}{" "}
                    <IconRound name="arrow_forward" className="text-sm" />
                  </button>
                </div>
              )}
            </div>

            {!loading && !error && routeResult.length > 0 && (
              <div className="pt-2">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4">
                  {l("优化后的行程", "Optimized Itinerary")}
                </h4>
                <div className="space-y-4">
                  {routeResult.map((res, idx) => {
                    const routeIdx = (res as any).preferredRouteIndex || 0;
                    const leg = res.routes[routeIdx].legs[0];

                    let mainInfo = "";
                    let subInfo = "";
                    let iconName = "place";
                    let colorClass =
                      "bg-slate-100 dark:bg-slate-800 text-slate-500";
                    let iconStyle = {};
                    const isFallback = (res as any).isFallback;

                    // --- DISPLAY LOGIC ---
                    if (travelMode === "TRANSIT" && !isFallback) {
                      // Filter for actual transit steps
                      const transitSteps = leg.steps?.filter(
                        (s: any) => s.travel_mode === "TRANSIT",
                      );

                      if (transitSteps && transitSteps.length > 0) {
                        // Case 1: Real Transit found
                        const mainStep = transitSteps[0];
                        const line = mainStep.transit.line;

                        // Format: [Line Name] - [Stops]
                        mainInfo = line.short_name || line.name;

                        // Sub info: Headsign
                        subInfo = `${l("开往", "Towards")} ${mainStep.transit.headsign || mainStep.transit.arrival_stop?.name}`;

                        const vType = line.vehicle?.type?.toLowerCase() || "";
                        if (vType.includes("subway") || vType.includes("metro"))
                          iconName = "subway";
                        else if (
                          vType.includes("train") ||
                          vType.includes("rail")
                        )
                          iconName = "train";
                        else if (vType.includes("bus"))
                          iconName = "directions_bus";
                        else iconName = "directions_transit";

                        if (line.color) {
                          colorClass = "text-white";
                          iconStyle = { backgroundColor: line.color };
                        } else {
                          colorClass =
                            "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300";
                        }
                      } else {
                        // Case 2: Transit Mode requested but returns walking (simplified)
                        // Requirement 10: Label as "Transit simplified by Google"
                        iconName = "directions_walk";
                        mainInfo = l(
                          "Google 简化的公共交通",
                          "Transit simplified by Google",
                        );
                        subInfo = l(
                          "距离很短，或步行更方便",
                          "Short distance or best connected by walk",
                        );
                        colorClass =
                          "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400";
                      }
                    } else if (travelMode === "WALKING" || isFallback) {
                      iconName = "directions_walk";
                      mainInfo = isFallback
                        ? l(
                            "步行（公共交通不可用）",
                            "Walk (Transit Unavailable)",
                          )
                        : l("步行", "Walk");
                      subInfo =
                        leg.end_address?.split(",")[0] ||
                        l("目的地", "Destination");
                      colorClass = isFallback
                        ? "bg-amber-100 text-amber-600"
                        : "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300";
                    } else {
                      iconName = "directions_car";
                      mainInfo = l("驾车", "Drive");
                      subInfo =
                        leg.end_address?.split(",")[0] ||
                        l("目的地", "Destination");
                      colorClass =
                        "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300";
                    }

                    return (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="size-6 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-sm truncate text-slate-900 dark:text-white block">
                              {l("前往：", "To:")} {myTrip[idx + 1]?.name}
                            </span>
                            {(() => {
                              const dest = myTrip[idx + 1];
                              const rec = dest
                                ? getRecommendedStay(dest)
                                : null;
                              if (!rec) return null;
                              return (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block truncate">
                                  {l("建议停留：", "Suggested time: ")}
                                  {formatStayMinutes(rec.minutes)}
                                </span>
                              );
                            })()}
                            {(() => {
                              const dest = myTrip[idx + 1];
                              const summary = formatOpeningHoursSummary(
                                dest?.openingHours,
                              );
                              if (!summary) return null;
                              return (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block truncate">
                                  {l("开放时间：", "Hours: ")}
                                  {summary}
                                </span>
                              );
                            })()}

                            {(() => {
                              const dest = myTrip[idx + 1];
                              if (!dest) return null;
                              const timing = visitTimingById.get(dest.id);
                              if (!timing) return null;

                              const isBad =
                                timing.status === "arrive_after_close" ||
                                timing.status === "not_enough_time" ||
                                timing.status === "closed";

                              const cls = isBad
                                ? "text-rose-600 dark:text-rose-300"
                                : timing.status === "unknown"
                                  ? "text-amber-600 dark:text-amber-300"
                                  : "text-emerald-600 dark:text-emerald-300";

                              return (
                                <span
                                  className={`text-xs font-semibold block whitespace-normal break-words ${cls}`}
                                >
                                  {l("时间：", "Time: ")}
                                  {timing.message}
                                </span>
                              );
                            })()}
                            {(() => {
                              const dest = myTrip[idx + 1];
                              const ticket = dest
                                ? formatTicketSummary(dest)
                                : null;
                              if (!ticket) return null;
                              return (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block truncate">
                                  {ticket}
                                </span>
                              );
                            })()}
                            {(() => {
                              const dest = myTrip[idx + 1];
                              const spend = dest
                                ? formatSpendSummary({
                                    priceLevel: dest.priceLevel,
                                    placeTypes: dest.placeTypes,
                                  })
                                : null;
                              if (!spend) return null;
                              return (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block truncate">
                                  {spend}
                                </span>
                              );
                            })()}
                            {(() => {
                              const dest = myTrip[idx + 1];
                              const summary = formatTipsSummary(dest?.tips, {
                                maxItems: 4,
                              });
                              if (!summary) return null;
                              return (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block whitespace-normal break-words">
                                  {l("注意：", "Tips: ")}
                                  {summary}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="ml-9 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
                          <div
                            className={`size-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${colorClass}`}
                            style={iconStyle}
                          >
                            <IconRound name={iconName} className="text-xl" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {mainInfo}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {subInfo}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[10px] font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                                {leg.duration?.text}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                • {leg.distance?.text}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {myTrip.length >= 2 && (
              <button
                onClick={handleOpenMaps}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-bold text-lg"
              >
                <IconRound name="directions" className="text-2xl" />
                {l("在 Google 地图打开", "Open in Google Maps")}
              </button>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="w-full h-[260px] lg:h-auto lg:flex-1 bg-slate-200 dark:bg-slate-900 relative shrink-0 order-first lg:order-none border-b lg:border-b-0 border-slate-200 dark:border-slate-800">
          <div ref={mapRef} className="absolute inset-0 z-0 w-full h-full" />
        </div>
      </main>

      <BudgetEstimateModal
        isOpen={isBudgetOpen}
        onClose={() => setBudgetOpen(false)}
        places={myTrip}
      />
    </div>
  );
};
