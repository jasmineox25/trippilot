import React from "react";
import { ViewState } from "../App";
import { useI18n } from "../i18n/react";
import { Icon } from "./Icon";

type TabKey = "explore" | "myTrips" | "community";

interface MobileTabBarProps {
  view: ViewState;
  onNavigate: (view: ViewState) => void;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  view,
  onNavigate,
}) => {
  const { l } = useI18n();

  const activeTab: TabKey | null = (() => {
    if (view === "community") return "community";
    if (view === "summary") return "myTrips";
    if (view === "home" || view === "map") return "explore";
    return null;
  })();

  const tabButtonClass = (tab: TabKey) => {
    const isActive = activeTab === tab;
    return [
      "flex flex-col items-center justify-center gap-1 flex-1 py-2",
      "transition-colors",
      isActive
        ? "text-primary"
        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
    ].join(" ");
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur"
      role="navigation"
      aria-label={l("底部导航", "Bottom navigation")}
    >
      <div className="max-w-[1440px] mx-auto px-2 pt-1 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
        <div className="flex items-stretch">
          <button
            type="button"
            className={tabButtonClass("myTrips")}
            aria-current={activeTab === "myTrips" ? "page" : undefined}
            onClick={() => onNavigate("summary")}
          >
            <Icon name="bookmark" className="text-[22px]" />
            <span className="text-[11px] font-semibold">
              {l("我的行程", "My Trips")}
            </span>
          </button>

          <button
            type="button"
            className={tabButtonClass("community")}
            aria-current={activeTab === "community" ? "page" : undefined}
            onClick={() => onNavigate("community")}
          >
            <Icon name="groups" className="text-[22px]" />
            <span className="text-[11px] font-semibold">
              {l("社区", "Community")}
            </span>
          </button>

          <button
            type="button"
            className={tabButtonClass("explore")}
            aria-current={activeTab === "explore" ? "page" : undefined}
            onClick={() => onNavigate("map")}
          >
            <Icon name="explore" className="text-[22px]" />
            <span className="text-[11px] font-semibold">
              {l("探索", "Explore")}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};
