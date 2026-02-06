import React, { useEffect, useMemo, useState } from "react";
import type { ViewState, TravelMode } from "../../App";
import type { Place } from "../../data";
import { Icon } from "../Icon";
import { useI18n } from "../../i18n/react";
import { useAuth } from "../../contexts/AuthContext";
import {
  deleteRoutePlan,
  listRoutePlans,
  type RoutePlanV1,
} from "../../services/firebase/routePlans";

type Props = {
  onNavigate: (view: ViewState) => void;
  setMyTrip: React.Dispatch<React.SetStateAction<Place[]>>;
  setTravelMode: (mode: TravelMode) => void;
  setDepartureTime: (time: string) => void;
  setRouteResult: (result: any[]) => void;
};

const formatLocalDateTime = (ms: number) => {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "";
  }
};

export const MyTripsView: React.FC<Props> = ({
  onNavigate,
  setMyTrip,
  setTravelMode,
  setDepartureTime,
  setRouteResult,
}) => {
  const { user, openAuth } = useAuth();
  const { l, locale } = useI18n();
  const uid = user?.id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<RoutePlanV1[]>([]);
  const [plansSource, setPlansSource] = useState<"cloud" | "local">("local");
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!uid) {
      setPlans([]);
      setPlansSource("local");
      setError(null);
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const { plans: list, source } = await listRoutePlans(uid);
        if (cancelled) return;
        setPlans(list);
        setPlansSource(source);
      } catch (e: any) {
        if (cancelled) return;
        setError(
          String(
            e?.message ||
              e ||
              l("加载已保存路线失败", "Failed to load saved trips"),
          ),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [uid, refreshNonce]);

  const subtitle = useMemo(() => {
    if (!uid)
      return l(
        "请登录后查看/管理已保存路线",
        "Sign in to view/manage saved trips",
      );

    if (plansSource === "cloud")
      return l("已登录 · 云端同步", "Signed in · Cloud sync");
    return l("已登录 · 本地数据", "Signed in · Local data");
  }, [uid, plansSource, l]);

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col">
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate("home")}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title={l("返回", "Back")}
          >
            <Icon name="arrow_back" />
          </button>
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Icon name="bookmark" className="text-xl" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
              {l("我的路线", "My Trips")}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!uid && (
            <button
              type="button"
              onClick={openAuth}
              className="px-3 py-2 rounded-lg text-sm font-bold bg-primary text-white hover:bg-blue-600 transition-colors"
              title={l("登录以同步到云端", "Sign in to sync to cloud")}
            >
              {l("登录同步", "Sign in to sync")}
            </button>
          )}
          {uid ? (
            <button
              type="button"
              onClick={() => setRefreshNonce((n) => n + 1)}
              className="px-3 py-2 rounded-lg text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              disabled={loading}
              title={l("刷新", "Refresh")}
            >
              {loading ? l("加载中…", "Loading…") : l("刷新", "Refresh")}
            </button>
          ) : null}
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-8">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-sm font-bold whitespace-pre-wrap">
            {error}
          </div>
        )}

        {!uid ? (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-lg font-extrabold">
              {l("请先登录", "Please sign in")}
            </div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {l(
                "My Trips 仅对登录用户开放，用于云端保存和管理多条路线。",
                "My Trips is only available to signed-in users, so you can save and manage multiple routes in the cloud.",
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={openAuth}
                className="px-4 py-2 rounded-xl bg-primary text-white font-extrabold hover:bg-blue-600 transition-colors"
              >
                {l("去登录", "Sign in")}
              </button>
              <button
                type="button"
                onClick={() => onNavigate("home")}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {l("返回首页", "Back to Home")}
              </button>
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-lg font-extrabold">
              {l("还没有保存的路线", "No saved trips yet")}
            </div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {l(
                "去 Route 结果页点击 “Save” 就会出现在这里（可保存多条）。",
                "Go to the Route results page and click “Save” — it will show up here (you can save multiple).",
              )}
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => onNavigate("home")}
                className="px-4 py-2 rounded-xl bg-primary text-white font-extrabold hover:bg-blue-600 transition-colors"
              >
                {l("去规划路线", "Plan a route")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-extrabold truncate">
                      {p.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                      <span>
                        {locale === "zh"
                          ? `${p.myTrip?.length || 0} 个站点`
                          : locale === "en"
                            ? `${p.myTrip?.length || 0} stop${(p.myTrip?.length || 0) === 1 ? "" : "s"}`
                            : `${p.myTrip?.length || 0} ${l("个站点", "Stops")}`}
                      </span>
                      <span>{p.travelMode}</span>
                      {p.departureTime ? <span>{p.departureTime}</span> : null}
                      {p.updatedAtMs ? (
                        <span>
                          {l("更新", "Updated")}:{" "}
                          {formatLocalDateTime(p.updatedAtMs)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setMyTrip(Array.isArray(p.myTrip) ? p.myTrip : []);
                        setTravelMode(p.travelMode);
                        setDepartureTime(p.departureTime || "");
                        setRouteResult([]);
                        onNavigate("route");
                      }}
                      className="px-3 py-2 rounded-xl bg-primary text-white font-extrabold hover:bg-blue-600 transition-colors"
                      title={l("打开此路线", "Open this plan")}
                    >
                      {l("打开", "Open")}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = window.confirm(
                          l(
                            "删除这条已保存的路线？",
                            "Delete this saved trip?",
                          ),
                        );
                        if (!ok) return;
                        await deleteRoutePlan(uid, p.id);
                        setRefreshNonce((n) => n + 1);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      title={l("删除", "Delete")}
                    >
                      {l("删除", "Delete")}
                    </button>
                  </div>
                </div>

                {Array.isArray(p.myTrip) && p.myTrip.length > 0 ? (
                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    {p.myTrip.map((x) => x.name).join(" → ")}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
