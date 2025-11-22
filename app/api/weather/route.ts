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
      const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely,hourly,alerts&appid=${key}`;
      const res = await fetch(url);
      const data = await res.json();
      // Ensure we return only the requested number of daily entries (if present)
      const daily = Array.isArray(data.daily) ? data.daily.slice(0, days) : [];
      return NextResponse.json({ timezone: data.timezone, lat: data.lat ?? lat, lon: data.lon ?? lon, current: data.current ?? null, daily });
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
