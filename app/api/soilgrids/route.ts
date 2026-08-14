import { NextResponse } from "next/server";
import { fetchSoilHive } from "@/lib/soilhive";

type CacheEntry = { expiresAt: number; data: unknown };
const cache = new Map<string, CacheEntry>();
const TTL = 24 * 60 * 60 * 1000;

/** Legacy route name retained for existing dashboard clients; data now comes from SoilHive. */
export async function POST(request: Request) {
  try {
    const { lat: rawLat, lon: rawLon } = await request.json(); const lat = Number(rawLat); const lon = Number(rawLon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return NextResponse.json({ error: "A valid farm location is required." }, { status: 400 });
    const key = `${lat.toFixed(5)}:${lon.toFixed(5)}`; const existing = cache.get(key);
    if (existing && existing.expiresAt > Date.now()) return NextResponse.json(existing.data, { headers: { "X-Soil-Cache": "HIT" } });
    const soil = await fetchSoilHive(lat, lon); cache.set(key, { data: soil, expiresAt: Date.now() + TTL }); return NextResponse.json(soil, { headers: { "X-Soil-Cache": "MISS" } });
  } catch (error) { console.error("SoilHive soil lookup failed", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "Soil information is temporarily unavailable. Please try again shortly." }, { status: 503 }); }
}

export async function GET() { return NextResponse.json({ provider: "SoilHive", status: "ready" }); }
