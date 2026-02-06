import React, { useMemo, useState } from "react";
import { Icon } from "../Icon";
import { Place } from "../../data";
import { ViewState } from "../../App";
import { MapView } from "../MapView";
import { PlaceSearch } from "../PlaceSearch";
import { ItineraryPlannerChatbot } from "../ItineraryPlannerChatbot";
import { searchPlaceByTextQuery } from "../../services/googleMaps";
import { IMAGES } from "../../constants";
import {
  formatStayMinutes,
  getRecommendedStay,
} from "../../utils/recommendedStay";
import {
  extractOpeningHoursFromLegacyShim,
  formatOpeningHoursSummary,
} from "../../utils/openingHours";
import { getPlaceTips, formatTipsSummary } from "../../utils/placeTips";
import { formatSpendSummary, formatTicketSummary } from "../../utils/cost";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../i18n/react";

interface MapSelectionViewProps {
  onNavigate: (view: ViewState) => void;
  myTrip: Place[];
  onAddPlace: (place: Place) => void;
  onRemovePlace: (id: string) => void;
}

export const MapSelectionView: React.FC<MapSelectionViewProps> = ({
  onNavigate,
  myTrip,
  onAddPlace,
  onRemovePlace,
}) => {
  const { l, locale } = useI18n();
  const { user, openAuth } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const [tagAddError, setTagAddError] = useState<string | null>(null);

  const selectedCountLabel = useMemo(() => {
    const n = myTrip.length;
    switch (locale) {
      case "zh":
        return `${n} 个已选`;
      case "ja":
        return `${n} 件選択`;
      default:
        return `${n} items selected`;
    }
  }, [locale, myTrip.length]);

  const handlePlaceSelect = (googlePlace: any) => {
    if (!googlePlace.geometry || !googlePlace.geometry.location) return;

    const openingHours = extractOpeningHoursFromLegacyShim(googlePlace);
    const placeTypes = Array.isArray(googlePlace.types)
      ? googlePlace.types
      : [];

    const newPlace: Place = {
      id: googlePlace.place_id || Math.random().toString(),
      name: googlePlace.name || googlePlace.formatted_address,
      loc: googlePlace.formatted_address || l("未知位置", "Unknown location"),
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
          : IMAGES.MAP_VIEW_THUMB, // Fallback image
      tag: "Custom",
      type: "Destination",
    };

    onAddPlace(newPlace);
  };

  const addDestinationFromTag = async (query: string) => {
    try {
      setTagAddError(null);
      const place = await searchPlaceByTextQuery({ textQuery: query });
      if (!place) {
        setSearchValue(query);
        setTagAddError(
          l(
            "没找到具体地点，已填入搜索框供你选择",
            "No specific place found — I filled the search box so you can pick.",
          ),
        );
        window.setTimeout(() => setTagAddError(null), 2500);
        return;
      }

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

      const openingFromNew =
        place.regularOpeningHours || place.currentOpeningHours
          ? {
            open_now:
              place.currentOpeningHours?.openNow ??
              place.currentOpeningHours?.open_now,
            weekday_text:
              place.regularOpeningHours?.weekdayText ||
              place.regularOpeningHours?.weekday_text ||
              place.currentOpeningHours?.weekdayText ||
              place.currentOpeningHours?.weekday_text,
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

      handlePlaceSelect(legacyShim);
      setSearchValue("");
    } catch (e) {
      console.warn("Add destination from tag failed", e);
      setSearchValue(query);
      setTagAddError(
        l(
          "添加失败，已填入搜索框供你选择",
          "Add failed — I filled the search box so you can pick.",
        ),
      );
      window.setTimeout(() => setTagAddError(null), 2500);
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col bg-background-light dark:bg-background-dark relative">
      {/* Map Container */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <MapView places={myTrip} />
      </div>

      {/* Top Controls */}
      <div className="absolute top-6 left-6 right-20 z-20 flex flex-col gap-3 w-auto max-w-[400px] pointer-events-none max-h-[calc(100dvh-180px)] overflow-y-auto no-scrollbar">
        <div className="pointer-events-auto">
          <ItineraryPlannerChatbot
            onPickPlace={(p) => {
              void addDestinationFromTag(p.query);
            }}
          />
        </div>
        {tagAddError && (
          <div className="text-xs text-amber-700 dark:text-amber-200 font-bold bg-white/90 dark:bg-[#1e293b]/90 rounded-lg shadow px-3 py-2 ring-1 ring-black/5 dark:ring-white/10 pointer-events-auto">
            {tagAddError}
          </div>
        )}
        <div className="bg-white dark:bg-[#1e293b] rounded-lg shadow-lg flex items-center p-2 transition-all ring-1 ring-black/5 dark:ring-white/10 pointer-events-auto">
          <button
            onClick={() => onNavigate("home")}
            className="p-2 text-slate-500 hover:text-primary"
          >
            <Icon name="arrow_back" className="text-[24px]" />
          </button>
          <div className="flex-1">
            <PlaceSearch
              onPlaceSelect={handlePlaceSelect}
              value={searchValue}
              onValueChange={setSearchValue}
              focusOnValueChange
            />
          </div>
        </div>
      </div>

      {/* Map Nav Buttons */}
      <div className="absolute top-6 right-6 z-20 flex gap-2 pointer-events-none">
        <button
          type="button"
          onClick={openAuth}
          className="size-10 flex items-center justify-center rounded-lg bg-white dark:bg-[#1e293b] shadow-lg text-[#111418] dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors pointer-events-auto"
          title={
            user
              ? `${l("已登录：", "Signed in: ")}${user.name}`
              : l("登录", "Login")
          }
        >
          <Icon name="account_circle" />
        </button>
      </div>

      <div className="absolute bottom-[340px] md:bottom-72 right-6 z-20 flex flex-col gap-2 pointer-events-none">
        {/* Map controls usually handled by Google Maps default UI now, keeping placeholder if needed or removing */}
      </div>

      {/* Bottom Dock */}
      <div className="absolute bottom-6 left-6 right-6 z-30 pointer-events-none">
        <div className="bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-md rounded-xl shadow-xl border border-white/20 dark:border-white/5 p-5 max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-start md:items-center pointer-events-auto">
          <div className="flex-shrink-0 flex flex-col gap-1 min-w-[200px]">
            <h2 className="text-[#111418] dark:text-white text-xl font-bold leading-tight">
              {l("你的行程", "Your Itinerary")}
            </h2>
            <p className="text-[#60758a] dark:text-gray-400 text-sm font-medium">
              {selectedCountLabel}
            </p>
            {myTrip.length > 0 && (
              <button
                onClick={() => myTrip.forEach((p) => onRemovePlace(p.id))}
                className="text-primary text-sm font-bold text-left hover:underline mt-1 w-fit"
              >
                {l("清空", "Clear all")}
              </button>
            )}
          </div>
          <div className="flex-1 w-full overflow-hidden">
            {myTrip.length === 0 ? (
              <div className="text-slate-400 text-sm italic py-4">
                {l(
                  "搜索并添加地点来构建你的行程。",
                  "Search and add places to build your trip.",
                )}
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {myTrip.map((item) => (
                  <div
                    key={item.id}
                    className="relative flex-shrink-0 w-64 bg-gray-50 dark:bg-[#0f151b] rounded-lg p-2 flex gap-3 group border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-colors"
                  >
                    <div
                      className="w-16 h-16 rounded-md bg-cover bg-center flex-shrink-0"
                      style={{ backgroundImage: `url(${item.img})` }}
                    ></div>
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                      <h3 className="font-bold text-[#111418] dark:text-white text-sm truncate">
                        {item.name}
                      </h3>
                      <p className="text-[#60758a] text-xs truncate">
                        {item.loc}
                      </p>
                      {(() => {
                        const rec = getRecommendedStay(item);
                        if (!rec) return null;
                        return (
                          <p className="text-[#60758a] text-[11px] truncate mt-0.5 font-medium">
                            {l("建议停留：", "Suggested: ")}
                            {formatStayMinutes(rec.minutes, locale)}
                          </p>
                        );
                      })()}
                      {(() => {
                        const summary = formatOpeningHoursSummary(
                          item.openingHours,
                          locale,
                        );
                        if (!summary) return null;
                        return (
                          <p className="text-[#60758a] text-[11px] truncate mt-0.5 font-medium">
                            {l("开放时间：", "Opening hours: ")}
                            {summary}
                          </p>
                        );
                      })()}
                      {(() => {
                        const ticket = formatTicketSummary({ ...item, locale });
                        if (!ticket) return null;
                        return (
                          <p className="text-[#60758a] text-[11px] truncate mt-0.5 font-medium">
                            {ticket}
                          </p>
                        );
                      })()}
                      {(() => {
                        const spend = formatSpendSummary({
                          priceLevel: item.priceLevel,
                          placeTypes: item.placeTypes,
                          locale,
                        });
                        if (!spend) return null;
                        return (
                          <p className="text-[#60758a] text-[11px] truncate mt-0.5 font-medium">
                            {spend}
                          </p>
                        );
                      })()}
                      {(() => {
                        const summary = formatTipsSummary(item.tips, {
                          maxItems: 4,
                        });
                        if (!summary) return null;
                        return (
                          <p className="text-[#60758a] text-[11px] mt-0.5 font-medium whitespace-normal break-words">
                            {l("提示：", "Tips: ")}
                            {summary}
                          </p>
                        );
                      })()}
                      <div className="flex items-center gap-1 mt-1">
                        <Icon
                          name="star"
                          className="text-yellow-500 text-[12px] filled"
                        />
                        <span className="text-xs text-[#111418] dark:text-gray-300 font-bold">
                          {item.rating}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemovePlace(item.id)}
                      className="absolute -top-2 -right-2 size-6 bg-white dark:bg-gray-700 shadow-sm rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Icon name="close" className="text-[14px]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
            <button
              onClick={() =>
                myTrip.length > 0
                  ? onNavigate("route")
                  : alert(l("请至少添加 1 个地点！", "Add at least one place!"))
              }
              className={`w-full md:w-auto h-12 font-bold rounded-lg px-8 flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-95 ${myTrip.length > 0 ? "bg-primary hover:bg-blue-600 text-white shadow-blue-500/30" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
            >
              <span>{l("生成路线", "Generate Route")}</span>
              <Icon name="arrow_forward" className="text-[20px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
