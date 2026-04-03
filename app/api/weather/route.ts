// app/api/weather/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lat = body.lat;
    const lon = body.lon;
    const days = Number(body.days || 1);
    if (!lat || !lon) return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });

    const key = process.env.OPENWEATHERMAP_API_KEY;
    if (!key) return NextResponse.json({ error: "OpenWeather API key not configured" }, { status: 500 });

    // If caller requests more than 1 day, use One Call endpoint and return daily forecasts.
    // One Call provides up to 7-8 day daily forecasts for free accounts; cap at 8 days here.
    const maxDays = 8;
    if (days && days > 1) {
      if (days > maxDays) {
        return NextResponse.json({ error: `Forecast unavailable for more than ${maxDays} days via this API` }, { status: 400 });
      }
      const oneCallUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely,hourly,alerts&appid=${key}`;
      const oneCallResponse = await fetch(oneCallUrl);
      if (oneCallResponse.ok) {
        const data = await oneCallResponse.json();
        const daily = Array.isArray(data.daily) ? data.daily.slice(0, days) : [];
        return NextResponse.json({ timezone: data.timezone, lat: data.lat ?? lat, lon: data.lon ?? lon, current: data.current ?? null, daily });
      }

      // Fallback to the 5 day / 3 hour endpoint so forecast still works if OneCall is unavailable.
      const fallbackUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;
      const fallbackResponse = await fetch(fallbackUrl);
      const fallbackJson = await fallbackResponse.json();
      if (!fallbackResponse.ok) {
        return NextResponse.json({ error: fallbackJson?.message || "Weather forecast fetch failed" }, { status: 502 });
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
          };
        });

      return NextResponse.json({ timezone: fallbackJson.city?.timezone ?? null, lat, lon, current: null, daily });
    }

    // default: return current weather (compatibility with existing callers)
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Weather fetch failed" }, { status: 500 });
  }
}
