// app/api/weather/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { lat, lon } = await req.json();
    if (!lat || !lon) return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });

const key = process.env.OPENWEATHERMAP_API_KEY;
    // const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely,alerts&appid=${key}`;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;

    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Weather fetch failed" }, { status: 500 });
  }
}
