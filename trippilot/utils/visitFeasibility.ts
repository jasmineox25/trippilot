import { Place } from "../data";
import { getRecommendedStay } from "./recommendedStay";
import {
  formatClock,
  formatMinutesAsHHMM,
  getBusinessHoursForDate,
} from "./businessHours";
import { getLocale } from "../i18n/i18n";

export type VisitTiming = {
  placeId: string;
  placeName: string;
  arrival: Date;
  depart: Date;
  waitMinutes: number;
  stayMinutes: number;
  status:
    | "ok"
    | "unknown"
    | "closed"
    | "arrive_after_close"
    | "not_enough_time";
  message?: string;
  closeMinutes?: number;
  overtimeMinutes?: number;
};

const safeLegDurationSec = (legResponse: any): number => {
  try {
    if (!legResponse?.routes?.length) return 0;
    const idx = (legResponse as any).preferredRouteIndex || 0;
    const leg = legResponse.routes[idx]?.legs?.[0];
    return Number(leg?.duration?.value || 0) || 0;
  } catch {
    return 0;
  }
};

const minutesSinceMidnight = (d: Date): number =>
  d.getHours() * 60 + d.getMinutes();

const isSameLocalDate = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const endOfLocalDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(24, 0, 0, 0);
  return x;
};

export const computeVisitFeasibility = (input: {
  places: Place[];
  legs: any[];
  departureTime: Date;
}): VisitTiming[] => {
  const { places, legs, departureTime } = input;
  if (!places || places.length === 0) return [];

  const locale = getLocale();
  const pick = (zh: string, en: string, ja?: string) =>
    locale === "zh" ? zh : locale === "ja" ? (ja ?? en) : en;

  const results: VisitTiming[] = [];

  let current = new Date(departureTime);
  const tripDay = new Date(departureTime);

  // Start location (index 0) doesn't need business hours check.
  for (let i = 1; i < places.length; i++) {
    const place = places[i];
    const legRes = legs[i - 1];

    const travelSec = safeLegDurationSec(legRes);
    const arrivalRaw = new Date(current.getTime() + travelSec * 1000);

    // If we arrive on a different calendar day, treat it as "not feasible" for a day itinerary.
    // This commonly happens in WALKING mode for long distances.
    if (!isSameLocalDate(arrivalRaw, tripDay)) {
      const eod = endOfLocalDay(tripDay);
      const overtimeMinutes = Math.max(
        0,
        Math.round((arrivalRaw.getTime() - eod.getTime()) / 60000),
      );

      const stay = getRecommendedStay(place);
      const stayMinutes = stay?.minutes ?? 60;
      const dep = new Date(arrivalRaw.getTime() + stayMinutes * 60 * 1000);

      results.push({
        placeId: place.id,
        placeName: place.name,
        arrival: arrivalRaw,
        depart: dep,
        waitMinutes: 0,
        stayMinutes,
        status: "arrive_after_close",
        overtimeMinutes,
        message: pick(
          `预计到达为次日 ${formatClock(arrivalRaw)}，已超出当日行程（晚约 ${overtimeMinutes} 分钟）。可提前出发/减少停留/改用更快交通方式。`,
          `ETA next day ${formatClock(arrivalRaw)} — beyond a day itinerary (about ${overtimeMinutes} min late). Consider departing earlier, reducing stay time, or using a faster transport mode.`,
          `到着予定が翌日 ${formatClock(arrivalRaw)} となり、当日行程を超過します（約 ${overtimeMinutes} 分遅れ）。出発を早める／滞在時間を短縮する／より速い移動手段に変更することを検討してください。`,
        ),
      });

      current = dep;
      continue;
    }

    const stay = getRecommendedStay(place);
    const stayMinutes = stay?.minutes ?? 60;

    const window = getBusinessHoursForDate(place.openingHours, arrivalRaw);

    let arrival = arrivalRaw;
    let waitMinutes = 0;

    if (window.status === "ok") {
      const arrMin = minutesSinceMidnight(arrivalRaw);
      const openMin = window.openMinutes;

      if (arrMin < openMin) {
        waitMinutes = openMin - arrMin;
        arrival = new Date(arrivalRaw.getTime() + waitMinutes * 60 * 1000);
      }

      const dep = new Date(arrival.getTime() + stayMinutes * 60 * 1000);

      const depMin = minutesSinceMidnight(dep);
      const arrAdjMin = minutesSinceMidnight(arrival);

      const closeMin = window.closeMinutes;

      if (arrAdjMin >= closeMin) {
        const overtimeMinutes = arrAdjMin - closeMin;
        results.push({
          placeId: place.id,
          placeName: place.name,
          arrival,
          depart: dep,
          waitMinutes,
          stayMinutes,
          status: "arrive_after_close",
          closeMinutes: closeMin,
          overtimeMinutes,
          message: pick(
            `预计到达 ${formatClock(arrival)}，但今日关门约 ${formatMinutesAsHHMM(closeMin)}，可能已经关门（晚约 ${overtimeMinutes} 分钟）。`,
            `ETA ${formatClock(arrival)}, but closes around ${formatMinutesAsHHMM(closeMin)} today — may already be closed (about ${overtimeMinutes} min late).`,
            `到着予定 ${formatClock(arrival)} ですが、本日の閉店は約 ${formatMinutesAsHHMM(closeMin)} のため、すでに閉まっている可能性があります（約 ${overtimeMinutes} 分遅れ）。`,
          ),
        });
        current = dep;
        continue;
      }

      if (depMin > closeMin) {
        const overtimeMinutes = depMin - closeMin;
        const suggestedStay = Math.max(15, stayMinutes - overtimeMinutes);
        results.push({
          placeId: place.id,
          placeName: place.name,
          arrival,
          depart: dep,
          waitMinutes,
          stayMinutes,
          status: "not_enough_time",
          closeMinutes: closeMin,
          overtimeMinutes,
          message: pick(
            `预计离开 ${formatClock(dep)}，但今日关门约 ${formatMinutesAsHHMM(closeMin)}，可能来不及（超约 ${overtimeMinutes} 分钟；可把停留调到约 ${suggestedStay} 分钟）。`,
            `Estimated departure ${formatClock(dep)}, but closes around ${formatMinutesAsHHMM(closeMin)} today — you may not have enough time (about ${overtimeMinutes} min over; consider reducing stay to ~${suggestedStay} min).`,
            `出発予定 ${formatClock(dep)} ですが、本日の閉店は約 ${formatMinutesAsHHMM(closeMin)} のため間に合わない可能性があります（約 ${overtimeMinutes} 分超過。滞在を約 ${suggestedStay} 分に短縮するなど）。`,
          ),
        });
        current = dep;
        continue;
      }

      results.push({
        placeId: place.id,
        placeName: place.name,
        arrival,
        depart: dep,
        waitMinutes,
        stayMinutes,
        status: "ok",
        message:
          waitMinutes > 0
            ? pick(
                `预计到达 ${formatClock(arrivalRaw)}，需等到开门（约 ${formatClock(arrival)}）`,
                `ETA ${formatClock(arrivalRaw)}; wait until it opens (~${formatClock(arrival)}).`,
                `到着予定 ${formatClock(arrivalRaw)}。開店まで待機（約 ${formatClock(arrival)}）。`,
              )
            : pick(
                `预计到达 ${formatClock(arrival)}`,
                `ETA ${formatClock(arrival)}`,
                `到着予定 ${formatClock(arrival)}`,
              ),
      });

      current = dep;
      continue;
    }

    if (window.status === "closed") {
      const dep = new Date(arrival.getTime() + stayMinutes * 60 * 1000);
      results.push({
        placeId: place.id,
        placeName: place.name,
        arrival,
        depart: dep,
        waitMinutes,
        stayMinutes,
        status: "closed",
        message: pick(
          "今日可能不营业（显示为 Closed/休息）。",
          "Likely closed today (shown as Closed).",
          "本日は休業の可能性があります（Closed と表示）。",
        ),
      });
      current = dep;
      continue;
    }

    // Unknown hours
    const dep = new Date(arrival.getTime() + stayMinutes * 60 * 1000);
    results.push({
      placeId: place.id,
      placeName: place.name,
      arrival,
      depart: dep,
      waitMinutes,
      stayMinutes,
      status: "unknown",
      message: pick(
        `预计到达 ${formatClock(arrival)}（营业时间未知）`,
        `ETA ${formatClock(arrival)} (hours unknown)`,
        `到着予定 ${formatClock(arrival)}（営業時間不明）`,
      ),
    });
    current = dep;
  }

  return results;
};

export const summarizeVisitFeasibility = (
  timings: VisitTiming[],
): {
  minDepartEarlierMinutes: number;
  stayReductionSuggestions: Array<{
    placeId: string;
    placeName: string;
    reduceByMinutes: number;
  }>;
} => {
  const minDepartEarlierMinutes = Math.max(
    0,
    ...timings
      .filter(
        (t) =>
          t.status === "arrive_after_close" || t.status === "not_enough_time",
      )
      .map((t) => Number(t.overtimeMinutes || 0) || 0),
  );

  const stayReductionSuggestions = timings
    .filter((t) => t.status === "not_enough_time")
    .map((t) => ({
      placeId: t.placeId,
      placeName: t.placeName,
      reduceByMinutes: Math.max(0, Number(t.overtimeMinutes || 0) || 0),
    }))
    .filter((x) => x.reduceByMinutes > 0)
    .sort((a, b) => b.reduceByMinutes - a.reduceByMinutes);

  return { minDepartEarlierMinutes, stayReductionSuggestions };
};
