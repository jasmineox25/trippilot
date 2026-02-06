import React from "react";
import { Icon } from "../Icon";
import { IMAGES } from "../../constants";
import { ViewState, TravelMode } from "../../App";
import { Place } from "../../data";
import {
  formatStayMinutes,
  getRecommendedStay,
} from "../../utils/recommendedStay";
import { formatOpeningHoursSummary } from "../../utils/openingHours";
import { formatTipsSummary } from "../../utils/placeTips";
import { formatSpendSummary, formatTicketSummary } from "../../utils/cost";
import { useI18n } from "../../i18n/react";

interface TimelineViewProps {
  onNavigate: (view: ViewState) => void;
  myTrip: Place[];
  travelMode: TravelMode;
  routeResult: any[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  onNavigate,
  myTrip,
  routeResult,
  travelMode,
}) => {
  // Calculate Totals strictly from routeResult
  let totalDuration = "0 min";
  let totalDistance = "0 km";

  if (routeResult && routeResult.length > 0) {
    let distVal = 0;
    let durVal = 0;
    routeResult.forEach((res) => {
      if (res.routes && res.routes.length > 0) {
        const idx = (res as any).preferredRouteIndex || 0;
        const leg = res.routes[idx].legs[0];
        distVal += leg.distance?.value || 0;
        durVal += leg.duration?.value || 0;
      }
    });
    totalDistance = (distVal / 1000).toFixed(1) + " km";
    const hours = Math.floor(durVal / 3600);
    const mins = Math.floor((durVal % 3600) / 60);
    totalDuration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  const startName = myTrip.length > 0 ? myTrip[0].name : "Start";

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-border-light dark:border-border-dark bg-white dark:bg-surface-dark px-4 lg:px-10 py-3 shadow-sm">
        <div className="flex items-center gap-4 lg:gap-8">
          <div
            className="flex items-center gap-3 text-slate-900 dark:text-white cursor-pointer"
            onClick={() => onNavigate("home")}
          >
            <Icon name="arrow_back" className="text-2xl" />
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-tight hidden sm:block">
            Detailed Directions
          </h2>
        </div>
        <div className="text-sm font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          Mode: {travelMode}
        </div>
      </header>

      <main className="w-full max-w-[1440px] mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-65px)]">
        <div className="flex-1 flex flex-col px-4 py-6 md:px-8 lg:px-12 lg:py-10 max-w-4xl mx-auto lg:mx-0 w-full">
          <div className="mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 rounded-xl p-4 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <Icon name="schedule" className="text-[20px] text-primary" />
                  Total Time
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {totalDuration}
                </p>
              </div>
              <div className="flex flex-col gap-1 rounded-xl p-4 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <Icon
                    name="straighten"
                    className="text-[20px] text-primary"
                  />
                  Total Distance
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {totalDistance}
                </p>
              </div>
            </div>
          </div>

          <div className="relative flex flex-col gap-0 pl-2">
            {/* Start Point */}
            <div className="grid grid-cols-[40px_1fr] gap-6 relative group">
              <div className="relative flex flex-col items-center pt-2">
                <div className="absolute top-8 bottom-[-1rem] left-1/2 -translate-x-1/2 w-0.5 bg-border-light dark:bg-border-dark z-0"></div>
                <div className="size-4 rounded-full border-2 border-primary bg-white dark:bg-surface-dark z-10 box-content"></div>
              </div>
              <div className="pb-8">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Start at {startName}
                </h3>
              </div>
            </div>

            {!routeResult || routeResult.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                Loading route data...
              </div>
            ) : (
              routeResult.map((res: any, index: number) => {
                const idx = (res as any).preferredRouteIndex || 0;
                const leg = res.routes[idx].legs[0];
                const destinationPlace = myTrip[index + 1];
                return (
                  <React.Fragment key={index}>
                    {/* Steps for this Leg */}
                    <div className="grid grid-cols-[40px_1fr] gap-6 relative">
                      <div className="relative flex flex-col items-center">
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0 border-l-2 border-dashed border-slate-300 dark:border-slate-600 z-0"></div>
                      </div>
                      <div className="pb-8 pt-1">
                        <div className="space-y-6">
                          {leg.steps.map((step: any, stepIdx: number) => {
                            const mode = step.travel_mode;

                            // Natural Language Logic
                            let instruction = "";
                            let subDetail = "";
                            let icon = "circle";
                            let colorClass = "bg-slate-200 text-slate-500";

                            if (mode === "TRANSIT" && step.transit) {
                              const lineName =
                                step.transit.line.short_name ||
                                step.transit.line.name;
                              const vehicle =
                                step.transit.vehicle?.name || "Transit";
                              const stops = step.transit.num_stops;
                              const arrival = step.transit.arrival_stop?.name;

                              instruction = `Take ${lineName} (${step.transit.headsign || "Direction"})`;
                              subDetail = `${stops} stops • Get off at ${arrival}`;

                              const vType =
                                step.transit.line.vehicle?.type?.toLowerCase();
                              icon =
                                vType === "subway"
                                  ? "subway"
                                  : "directions_bus";
                              colorClass = "bg-blue-100 text-blue-600";
                            } else if (mode === "WALKING") {
                              const tempDiv = document.createElement("div");
                              tempDiv.innerHTML = step.instructions;
                              const text =
                                tempDiv.textContent || tempDiv.innerText || "";

                              instruction =
                                text || `Walk ${step.distance?.text}`;
                              subDetail = `${step.distance?.text} • ${step.duration?.text}`;
                              icon = "directions_walk";
                              colorClass = "bg-slate-200 text-slate-500";
                            } else {
                              // Driving / Other
                              const tempDiv = document.createElement("div");
                              tempDiv.innerHTML = step.instructions;
                              instruction = tempDiv.textContent || "Travel";
                              subDetail = `${step.distance?.text}`;
                              icon = "directions_car";
                            }

                            return (
                              <div key={stepIdx} className="flex gap-4 group">
                                <div
                                  className={`mt-0.5 size-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}
                                >
                                  <Icon name={icon} className="text-lg" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                                    {instruction}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                    {subDetail}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Arrival Marker */}
                    <TimelineItem
                      num={index + 2}
                      img={destinationPlace?.img || IMAGES.MAP_VIEW_THUMB}
                      title={destinationPlace?.name || "Stop " + (index + 2)}
                      address={destinationPlace?.loc || leg.end_address}
                      place={destinationPlace}
                    />
                  </React.Fragment>
                );
              })
            )}

            {/* Finish Line */}
            <div className="grid grid-cols-[40px_1fr] gap-6 relative group">
              <div className="relative flex flex-col items-center pt-0">
                <div className="absolute top-0 bottom-full left-1/2 -translate-x-1/2 w-0 border-l-2 border-dashed border-slate-300 dark:border-slate-600 z-0"></div>
                <div className="size-4 rounded-full bg-slate-400 z-10 box-content"></div>
              </div>
              <div className="pb-2">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                    Finish
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const TimelineItem = ({ num, img, title, address, place }: any) => {
  const { l } = useI18n();

  return (
    <div className="grid grid-cols-[40px_1fr] gap-6 relative group">
      <div className="relative flex flex-col items-center pt-6">
        <div className="absolute top-0 bottom-[-1.5rem] left-1/2 -translate-x-1/2 w-0.5 bg-border-light dark:bg-border-dark z-0"></div>
        <div className="size-6 rounded-full bg-primary text-white flex items-center justify-center z-10 shadow-lg shadow-primary/30 text-xs font-bold">
          {num}
        </div>
      </div>
      <div className="pb-8">
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div
              className="w-full sm:w-20 h-20 rounded-lg bg-gray-200 bg-cover bg-center shrink-0"
              style={{ backgroundImage: `url(${img})` }}
            ></div>
            <div className="flex flex-col flex-1 min-w-0 justify-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                {title}
              </h3>
              <p className="text-sm text-slate-500">{address}</p>
              {(() => {
                const rec = getRecommendedStay(place || {});
                if (!rec) return null;
                return (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {l("建议停留：", "Suggested time: ")}
                    {formatStayMinutes(rec.minutes)}
                  </p>
                );
              })()}
              {(() => {
                const summary = formatOpeningHoursSummary(place?.openingHours);
                if (!summary) return null;
                return (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {l("开放时间：", "Hours: ")}
                    {summary}
                  </p>
                );
              })()}
              {(() => {
                const ticket = formatTicketSummary(place || {});
                if (!ticket) return null;
                return (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {ticket}
                  </p>
                );
              })()}
              {(() => {
                const spend = formatSpendSummary({
                  priceLevel: place?.priceLevel,
                  placeTypes: place?.placeTypes,
                });
                if (!spend) return null;
                return (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {spend}
                  </p>
                );
              })()}
              {(() => {
                const summary = formatTipsSummary(place?.tips, { maxItems: 2 });
                if (!summary) return null;
                return (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {l("注意：", "Tips: ")}
                    {summary}
                  </p>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
