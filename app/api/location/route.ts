import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { state, lga } = await request.json();
    if (typeof state !== "string" || typeof lga !== "string" || !state.trim() || !lga.trim()) {
      return NextResponse.json({ error: "Choose both a state and local government area." }, { status: 400 });
    }

    async function search(name: string) {
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.searchParams.set("name", name);
      url.searchParams.set("count", "10");
      url.searchParams.set("language", "en");
      const response = await fetch(url, { signal: AbortSignal.timeout(8_000), next: { revalidate: 60 * 60 * 24 * 30 } });
      const data = await response.json();
      return { response, results: Array.isArray(data?.results) ? data.results : [] };
    }
    // Open-Meteo does not reliably resolve comma-separated LGA queries. Search the
    // locality first, then safely fall back to the state centroid for a usable forecast.
    let result = await search(lga.trim());
    let match = result.results.find((item: { country_code?: string; admin1?: string }) => item.country_code === "NG" && (!item.admin1 || item.admin1.toLowerCase() === state.trim().toLowerCase()));
    if (!match) {
      result = await search(state.trim());
      match = result.results.find((item: { country_code?: string }) => item.country_code === "NG");
    }
    if (!result.response.ok || !Number.isFinite(match?.latitude) || !Number.isFinite(match?.longitude)) {
      return NextResponse.json({ error: "We could not find that farm location. Please choose another LGA." }, { status: 404 });
    }
    return NextResponse.json({ lat: match.latitude, lon: match.longitude, name: match.name });
  } catch (error) {
    console.error("Location lookup failed", error);
    return NextResponse.json({ error: "Location lookup is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
