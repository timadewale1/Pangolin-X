import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { state, lga } = await request.json();
    if (typeof state !== "string" || typeof lga !== "string" || !state.trim() || !lga.trim()) {
      return NextResponse.json({ error: "Choose both a state and local government area." }, { status: 400 });
    }

    const query = `${lga}, ${state}, Nigeria`;
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", query);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000), next: { revalidate: 60 * 60 * 24 * 30 } });
    const data = await response.json();
    const match = data?.results?.[0];
    if (!response.ok || !Number.isFinite(match?.latitude) || !Number.isFinite(match?.longitude)) {
      return NextResponse.json({ error: "We could not find that farm location. Please choose another LGA." }, { status: 404 });
    }
    return NextResponse.json({ lat: match.latitude, lon: match.longitude, name: match.name });
  } catch (error) {
    console.error("Location lookup failed", error);
    return NextResponse.json({ error: "Location lookup is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
