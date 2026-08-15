// app/api/weather/route.ts
import { NextResponse } from "next/server";

const WEATHER_TTL_MS = 15 * 60 * 1000;
const weatherCache = new Map<string, { expiresAt: number; payload: unknown }>();

async function fetchWithTimeout(url: string) {
  return fetch(url, { signal: AbortSignal.timeout(9_000), next: { revalidate: 900 } });
}

function describeWeatherCode(code: number | null | undefined) {
  if (code === 0) return "Clear sky";
  if ([1, 2].includes(Number(code))) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(Number(code))) return "Fog";
  if ([51, 53, 55].includes(Number(code))) return "Drizzle";
  if ([61, 63, 65].includes(Number(code))) return "Rain";
  if ([71, 73, 75, 77].includes(Number(code))) return "Snow";
  if ([80, 81, 82].includes(Number(code))) return "Showers";
  if ([95, 96, 99].includes(Number(code))) return "Thunderstorm";
  return "Unknown";
}

async function fetchOpenMeteoFallback(lat: number, lon: number, days: number) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m,precipitation");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,precipitation_sum");
  url.searchParams.set("forecast_days", String(Math.max(1, Math.min(days, 10))));

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) return null;
  const data = await response.json();
  const daily = Array.isArray(data?.daily?.time)
    ? data.daily.time.slice(0, days).map((time: string, index: number) => ({
        dt: Math.floor(new Date(time).getTime() / 1000),
        temp: {
          min: data.daily.temperature_2m_min?.[index],
          max: data.daily.temperature_2m_max?.[index],
          day: data.daily.temperature_2m_max?.[index],
          night: data.daily.temperature_2m_min?.[index],
        },
        weather: [
          {
            description: describeWeatherCode(data.daily.weather_code?.[index]),
            id: data.daily.weather_code?.[index],
          },
        ],
        humidity: data.current?.relative_humidity_2m ?? null,
        pressure: data.current?.pressure_msl ?? null,
        wind_speed: data.current?.wind_speed_10m ?? null,
        rain: data.daily.precipitation_sum?.[index] ?? null,
      }))
    : [];

  return {
    timezone: data.timezone ?? null,
    lat,
    lon,
    current: {
      temp: data.current?.temperature_2m ?? null,
      feels_like: data.current?.apparent_temperature ?? null,
      humidity: data.current?.relative_humidity_2m ?? null,
      pressure: data.current?.pressure_msl ?? null,
      weather: [
        {
          description: describeWeatherCode(data.current?.weather_code),
          id: data.current?.weather_code,
        },
      ],
      wind_speed: data.current?.wind_speed_10m ?? null,
      rain: data.current?.precipitation ?? null,
    },
    daily,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    const days = Number(body.days || 1);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return NextResponse.json({ error: "Enter a valid farm location before checking the weather." }, { status: 400 });
    const cacheKey = `${lat.toFixed(3)}:${lon.toFixed(3)}:${Math.max(1, Math.min(days, 10))}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return NextResponse.json(cached.payload, { headers: { "X-Pangolin-Cache": "HIT" } });

    const respond = (payload: unknown) => {
      weatherCache.set(cacheKey, { expiresAt: Date.now() + WEATHER_TTL_MS, payload });
      return NextResponse.json(payload, { headers: { "X-Pangolin-Cache": "MISS" } });
    };

    const key = process.env.OPENWEATHERMAP_API_KEY;
    if (!key) {
      const meteo = await fetchOpenMeteoFallback(lat, lon, days);
      return meteo ? respond(meteo) : NextResponse.json({ error: "Weather is temporarily unavailable. Please try again shortly." }, { status: 503 });
    }

    // If caller requests more than 1 day, use One Call endpoint and return daily forecasts.
    // One Call provides up to 7-8 day daily forecasts for free accounts; cap at 8 days here.
    const maxDays = 8;
    if (days && days > 1) {
      if (days > maxDays) {
        return NextResponse.json({ error: `Forecast unavailable for more than ${maxDays} days via this API` }, { status: 400 });
      }
      const oneCallUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely,hourly,alerts&appid=${key}`;
      const oneCallResponse = await fetchWithTimeout(oneCallUrl);
      if (oneCallResponse.ok) {
        const data = await oneCallResponse.json();
        const daily = Array.isArray(data.daily) ? data.daily.slice(0, days) : [];
        return respond({ timezone: data.timezone, lat: data.lat ?? lat, lon: data.lon ?? lon, current: data.current ?? null, daily });
      }

      // Fallback to the 5 day / 3 hour endpoint so forecast still works if OneCall is unavailable.
      const fallbackUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;
      const fallbackResponse = await fetchWithTimeout(fallbackUrl);
      const fallbackJson = await fallbackResponse.json();
      if (!fallbackResponse.ok) {
        const meteo = await fetchOpenMeteoFallback(lat, lon, days);
        if (meteo) return respond(meteo);
        return NextResponse.json({ error: "Weather forecast is temporarily unavailable. Please try again shortly." }, { status: 503 });
      }

      const grouped = new Map<string, { bucket: number[]; items: Array<Record<string, unknown>> }>();
      (fallbackJson.list ?? []).forEach((item: Record<string, unknown>) => {
        const dt = Number(item.dt ?? 0);
        const date = new Date(dt * 1000).toISOString().split("T")[0];
        const current = grouped.get(date) ?? { bucket: [], items: [] };
        current.bucket.push(Number((item.main as { temp?: number })?.temp ?? 0));
        current.items.push(item);
        grouped.set(date, current);
      });

      const daily = Array.from(grouped.entries())
        .slice(0, days)
        .map(([, entry]) => {
          const first = entry.items[0] as {
            dt?: number;
            weather?: Array<{ description?: string; main?: string; icon?: string; id?: number }>;
            wind?: { speed?: number };
            main?: { humidity?: number; pressure?: number };
            rain?: { "3h"?: number };
          };
          return {
            dt: first.dt,
            temp: {
              min: Math.min(...entry.bucket),
              max: Math.max(...entry.bucket),
              day: entry.bucket[Math.floor(entry.bucket.length / 2)] ?? entry.bucket[0],
              night: entry.bucket[entry.bucket.length - 1] ?? entry.bucket[0],
            },
            weather: first.weather ?? [],
            humidity: first.main?.humidity,
            pressure: first.main?.pressure,
            wind_speed: first.wind?.speed,
            rain: entry.items.reduce((total, item) => total + (Number((item.rain as { "3h"?: number } | undefined)?.["3h"] ?? 0) || 0), 0),
          };
        });

      const currentItem = Array.isArray(fallbackJson.list) ? fallbackJson.list[0] as {
        main?: { temp?: number; feels_like?: number; humidity?: number; pressure?: number };
        weather?: Array<{ description?: string; icon?: string; id?: number }>;
        wind?: { speed?: number };
        rain?: { "1h"?: number; "3h"?: number };
      } : null;
      const current = currentItem ? {
        temp: currentItem.main?.temp ?? null,
        feels_like: currentItem.main?.feels_like ?? currentItem.main?.temp ?? null,
        humidity: currentItem.main?.humidity ?? null,
        pressure: currentItem.main?.pressure ?? null,
        weather: currentItem.weather ?? [],
        wind_speed: currentItem.wind?.speed ?? null,
        rain: currentItem.rain?.["3h"] ?? null,
      } : null;
      return respond({ timezone: fallbackJson.city?.timezone ?? null, lat, lon, current, daily });
    }

    // default: return current weather (compatibility with existing callers)
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      const meteo = await fetchOpenMeteoFallback(lat, lon, 1);
      if (meteo) return respond(meteo);
      return NextResponse.json({ error: "Weather is temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
    const data = await res.json();
    return respond(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Weather is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
}
