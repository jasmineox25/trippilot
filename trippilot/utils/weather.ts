import { getLocale, l, type Locale } from "../i18n/i18n";

export type WeatherNow = {
  temperatureC?: number;
  precipitationMm?: number;
  rainMm?: number;
  showersMm?: number;
  snowfallCm?: number;
  windKph?: number;
  cloudCoverPct?: number;
  isDay?: boolean;
  time?: string;
};

type OpenMeteoResponse = {
  current?: {
    time?: string;
    temperature_2m?: number;
    precipitation?: number;
    rain?: number;
    showers?: number;
    snowfall?: number;
    wind_speed_10m?: number;
    cloud_cover?: number;
    is_day?: number;
  };
};

const cache = new Map<string, { atMs: number; data: WeatherNow }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

const keyFor = (lat: number, lng: number) =>
  `${lat.toFixed(3)},${lng.toFixed(3)}`;

export const fetchWeatherNow = async (
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<WeatherNow> => {
  const key = keyFor(lat, lng);
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && now - cached.atMs < CACHE_TTL_MS) return cached.data;

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "precipitation",
      "rain",
      "showers",
      "snowfall",
      "wind_speed_10m",
      "cloud_cover",
      "is_day",
    ].join(","),
  );
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`weather_fetch_failed_${res.status}`);

  const json = (await res.json()) as OpenMeteoResponse;
  const c = json.current || {};
  const data: WeatherNow = {
    time: c.time,
    temperatureC: c.temperature_2m,
    precipitationMm: c.precipitation,
    rainMm: c.rain,
    showersMm: c.showers,
    snowfallCm: c.snowfall,
    windKph: c.wind_speed_10m,
    cloudCoverPct: c.cloud_cover,
    isDay: typeof c.is_day === "number" ? c.is_day === 1 : undefined,
  };

  cache.set(key, { atMs: now, data });
  return data;
};

export const formatWeatherBrief = (
  w?: WeatherNow,
  locale: Locale = getLocale(),
): string | null => {
  if (!w) return null;
  const parts: string[] = [];
  if (typeof w.temperatureC === "number")
    parts.push(`${Math.round(w.temperatureC)}°C`);
  const precip =
    (typeof w.precipitationMm === "number" ? w.precipitationMm : 0) || 0;
  if (precip > 0)
    parts.push(`${l("降水 ", "Precip ", locale)}${precip.toFixed(1)}mm`);
  if (typeof w.windKph === "number" && w.windKph >= 20)
    parts.push(`${l("风 ", "Wind ", locale)}${Math.round(w.windKph)}km/h`);
  if (typeof w.cloudCoverPct === "number" && w.cloudCoverPct >= 70)
    parts.push(
      `${l("多云 ", "Cloudy ", locale)}${Math.round(w.cloudCoverPct)}%`,
    );
  return parts.length ? parts.join(" • ") : null;
};
