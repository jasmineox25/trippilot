import React from "react";
import { Icon } from "../Icon";
import { IMAGES } from "../../constants";
import { Place } from "../../data";
import { ViewState, TravelMode } from "../../App";
import {
  formatStayMinutes,
  getRecommendedStay,
} from "../../utils/recommendedStay";
import { formatOpeningHoursSummary } from "../../utils/openingHours";
import { formatTipsSummary } from "../../utils/placeTips";
import { formatSpendSummary, formatTicketSummary } from "../../utils/cost";
import {
  fetchWeatherNow,
  formatWeatherBrief,
  type WeatherNow,
} from "../../utils/weather";
import { useI18n } from "../../i18n/react";

interface SummaryViewProps {
  onNavigate: (view: ViewState) => void;
  myTrip: Place[];
  travelMode: TravelMode;
  routeResult: any[];
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  onNavigate,
  myTrip,
  routeResult,
}) => {
  const { l } = useI18n();
  const [weather, setWeather] = React.useState<WeatherNow | undefined>(
    undefined,
  );

  React.useEffect(() => {
    let active = true;
    const target = myTrip[1] || myTrip[0];
    if (
      target &&
      typeof target.lat === "number" &&
      typeof target.lng === "number"
    ) {
      fetchWeatherNow(target.lat, target.lng)
        .then((w) => {
          if (active) setWeather(w);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [myTrip]);

  // Calculate from Route Result Array
  let totalDistanceVal = 0;
  if (routeResult && routeResult.length > 0) {
    routeResult.forEach((res) => {
      if (res.routes[0] && res.routes[0].legs) {
        res.routes[0].legs.forEach(
          (leg: any) => (totalDistanceVal += leg.distance.value),
        );
      }
    });
  }
  const totalDistance = (totalDistanceVal / 1000).toFixed(1) + " km";

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white h-screen flex flex-col overflow-hidden">
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate("home")}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Icon name="arrow_back" />
          </button>
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Icon name="map" className="text-xl" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
              Trip Summary
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {myTrip.length} stops
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="w-full md:w-[480px] lg:w-[520px] flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full overflow-y-auto z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] custom-scrollbar">
          <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                Trip Stats
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <SummaryStat
                icon="place"
                color="text-primary"
                label="Stops"
                val={myTrip.length.toString()}
              />
              <SummaryStat
                icon="straighten"
                color="text-indigo-500"
                label="Distance"
                val={totalDistance}
              />
              <SummaryStat
                icon="partly_cloudy_day"
                color="text-amber-500"
                label={l("天气/预报", "Weather")}
                val={formatWeatherBrief(weather, locale) || "--"}
                isSmallText={true}
              />
            </div>
          </div>

          <div className="p-6 md:p-8 flex-1">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Places
              </h2>
            </div>
            <div className="relative pl-2">
              {myTrip.length === 0 ? (
                <p className="text-slate-500 italic">No places added.</p>
              ) : (
                myTrip.map((place, i) => (
                  <React.Fragment key={place.id}>
                    {(() => {
                      const rec = getRecommendedStay(place);
                      const stayLine = rec
                        ? `${l("建议停留：", "Suggested time: ")}${formatStayMinutes(
                            rec.minutes,
                          )}`
                        : "";
                      const openingLine =
                        formatOpeningHoursSummary(place.openingHours) || "";
                      const ticketLine = formatTicketSummary(place) || "";
                      const spendLine =
                        formatSpendSummary({
                          priceLevel: place.priceLevel,
                          placeTypes: place.placeTypes,
                        }) || "";
                      const tipsLine =
                        formatTipsSummary(place.tips, { maxItems: 2 }) || "";
                      const desc = stayLine
                        ? `${place.loc} • ${stayLine}${openingLine ? ` • ${l("开放时间：", "Hours: ")}${openingLine}` : ""}${ticketLine ? ` • ${ticketLine}` : ""}${spendLine ? ` • ${spendLine}` : ""}${tipsLine ? ` • ${l("注意：", "Tips: ")}${tipsLine}` : ""}`
                        : `${place.loc}${openingLine ? ` • ${l("开放时间：", "Hours: ")}${openingLine}` : ""}${ticketLine ? ` • ${ticketLine}` : ""}${spendLine ? ` • ${spendLine}` : ""}${tipsLine ? ` • ${l("注意：", "Tips: ")}${tipsLine}` : ""}`;

                      return (
                        <TimelineItemKyoto
                          time={`Stop ${i + 1}`}
                          title={place.name}
                          desc={desc}
                          isLast={i === myTrip.length - 1}
                          img={place.img}
                          tag="Destination"
                          tagIcon="place"
                          tagColor="blue"
                        />
                      );
                    })()}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="hidden md:block flex-1 relative bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <p className="text-slate-400">
            Map Overview Available in "Explore" or "Route" View
          </p>
        </main>
      </div>
    </div>
  );
};

const SummaryStat = ({
  icon,
  color,
  label,
  val,
  bg,
  border,
  isSmallText,
}: any) => (
  <div
    className={`flex flex-col items-center justify-center p-4 rounded-xl ${bg || "bg-slate-50 dark:bg-slate-800/50"} border ${border || "border-slate-100 dark:border-slate-700"}`}
  >
    <div
      className={`${color} mb-2 p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm`}
    >
      <Icon name={icon} className="text-xl" />
    </div>
    <p className={`text-xs text-slate-500 font-semibold mb-0.5`}>{label}</p>
    <p
      className={`${isSmallText ? "text-sm text-center line-clamp-2 leading-tight" : "text-xl"} font-bold ${color.includes("emerald") ? "text-emerald-800 dark:text-emerald-300" : "text-slate-900 dark:text-white"}`}
    >
      {val}
    </p>
  </div>
);

const TimelineItemKyoto = ({
  time,
  title,
  desc,
  isLast,
  img,
  tag,
  tagIcon,
  tagColor,
  icon,
  iconBg,
  iconColor,
  grayscale,
}: any) => (
  <div className={`group relative flex gap-5 ${isLast ? "" : "pb-10"}`}>
    {!isLast && (
      <div className="absolute left-[20px] top-10 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 group-last:hidden"></div>
    )}
    <div className="relative z-10 shrink-0 mt-1">
      {img ? (
        <div
          className={`size-11 bg-cover bg-center rounded-full border-[3px] border-white dark:border-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-transform hover:scale-110 ${grayscale ? "grayscale opacity-80" : ""}`}
          style={{ backgroundImage: `url(${img})` }}
        ></div>
      ) : (
        <div
          className={`size-11 rounded-full ${iconBg} flex items-center justify-center border-[3px] border-white dark:border-slate-900 ${iconColor} shadow-sm ring-1 ring-slate-100 dark:ring-slate-800`}
        >
          <Icon name={icon} className="text-[20px]" />
        </div>
      )}
    </div>
    <div className="flex-1 pt-1.5">
      <div className="flex justify-between items-start mb-1.5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
          {title}
        </h3>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
          {time}
        </span>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
        {desc}
      </p>
    </div>
  </div>
);
