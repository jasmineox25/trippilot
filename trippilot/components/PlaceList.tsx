import React from "react";
import { Icon } from "./Icon";
import { useI18n } from "../i18n/react";

interface PlaceData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
}

interface PlaceListProps {
  places: PlaceData[];
  onRemove: (id: string) => void;
}

export const PlaceList: React.FC<PlaceListProps> = ({ places, onRemove }) => {
  const { l } = useI18n();

  if (places.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <div className="bg-slate-200 dark:bg-slate-700 p-3 rounded-full mb-3 text-slate-400">
          <Icon name="add_location_alt" className="text-2xl" />
        </div>
        <p className="font-medium text-slate-600 dark:text-slate-300">
          {l("还没有添加地点。", "No places added yet.")}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {l(
            "使用搜索框查找并把目的地添加到行程中。",
            "Use the search bar to find and add destinations to your trip.",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {places.map((place, index) => (
        <div
          key={place.id}
          className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-all animate-in fade-in slide-in-from-left-4 duration-300"
        >
          <div className="flex items-start gap-3 overflow-hidden">
            <div className="flex-shrink-0 size-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
              {index + 1}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white truncate">
                {place.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {place.address}
              </p>
            </div>
          </div>
          <button
            onClick={() => onRemove(place.id)}
            className="flex-shrink-0 ml-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            title={l("移除地点", "Remove place")}
          >
            <Icon name="delete" />
          </button>
        </div>
      ))}
    </div>
  );
};
