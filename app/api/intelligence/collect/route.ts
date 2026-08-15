import { NextResponse } from "next/server";
import { admin, adminDB } from "@/lib/firebaseAdmin";
import { fetchCropHealthSignals, fetchMarketSignals } from "@/lib/news";
import { fetchSentinelVegetation } from "@/lib/sentinelVegetation";

function weatherSnapshot(weather: unknown) {
  const source = weather && typeof weather === "object" ? weather as Record<string, unknown> : {};
  const current = source.current && typeof source.current === "object" ? source.current as Record<string, unknown> : source.main && typeof source.main === "object" ? source.main as Record<string, unknown> : {};
  const weatherItems = Array.isArray(current.weather) ? current.weather : Array.isArray(source.weather) ? source.weather : [];
  const first = weatherItems[0] && typeof weatherItems[0] === "object" ? weatherItems[0] as Record<string, unknown> : {};
  const rain = source.rain && typeof source.rain === "object" ? source.rain as Record<string, unknown> : {};
  return {
    temp: Number(current.temp ?? current.temperature_2m),
    humidity: Number(current.humidity ?? current.relative_humidity_2m),
    windSpeed: Number(current.wind_speed ?? (source.wind && typeof source.wind === "object" ? (source.wind as Record<string, unknown>).speed : undefined)),
    rainMm: Number(current.rain ?? rain["1h"] ?? rain["3h"]),
    condition: typeof first.description === "string" ? first.description : null,
  };
}

function validSnapshot(snapshot: ReturnType<typeof weatherSnapshot>) {
  return Number.isFinite(snapshot.temp) || Number.isFinite(snapshot.humidity) || Number.isFinite(snapshot.windSpeed) || Number.isFinite(snapshot.rainMm);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!adminDB || typeof body.userId !== "string" || !body.userId) {
      return NextResponse.json({ collected: false });
    }

    const snapshot = weatherSnapshot(body.weather);
    const farmer = adminDB.collection("farmers").doc(body.userId);
    const now = admin.firestore.Timestamp.now();
    let weatherCollected = false;

    if (validSnapshot(snapshot)) {
      const recent = await farmer.collection("weatherObservations").orderBy("observedAt", "desc").limit(1).get();
      const previous = recent.docs[0]?.data()?.observedAt;
      const previousMs = previous && typeof previous.toMillis === "function" ? previous.toMillis() : 0;
      if (!previousMs || now.toMillis() - previousMs >= 3 * 60 * 60 * 1000) {
        await farmer.collection("weatherObservations").add({
          ...snapshot,
          lat: Number(body.lat),
          lon: Number(body.lon),
          source: "live-weather",
          observedAt: now,
        });
        weatherCollected = true;
      }
    }

    const refreshSignals = body.refreshSignals === true;
    if (refreshSignals && typeof body.location === "string" && Array.isArray(body.crops)) {
      const latest = await farmer.collection("externalSignals").orderBy("collectedAt", "desc").limit(1).get();
      const previous = latest.docs[0]?.data()?.collectedAt;
      const previousMs = previous && typeof previous.toMillis === "function" ? previous.toMillis() : 0;
      if (!previousMs || now.toMillis() - previousMs >= 12 * 60 * 60 * 1000) {
        const crops = body.crops.filter((crop: unknown): crop is string => typeof crop === "string").slice(0, 6);
        const [market, cropHealth] = await Promise.all([
          fetchMarketSignals(body.location, crops, 5),
          fetchCropHealthSignals(body.location, crops, 5),
        ]);
        await farmer.collection("externalSignals").add({
          location: body.location,
          market: market ?? [],
          cropHealth: cropHealth ?? [],
          source: "targeted-google-news",
          collectedAt: now,
        });
      }
    }

    if (body.collectVegetation === true && Number.isFinite(Number(body.lat)) && Number.isFinite(Number(body.lon))) {
      const latest = await farmer.collection("vegetationObservations").orderBy("collectedAt", "desc").limit(1).get();
      const previous = latest.docs[0]?.data()?.collectedAt;
      const previousMs = previous && typeof previous.toMillis === "function" ? previous.toMillis() : 0;
      if (!previousMs || now.toMillis() - previousMs >= 5 * 24 * 60 * 60 * 1000) {
        const vegetation = await fetchSentinelVegetation(Number(body.lat), Number(body.lon));
        if (vegetation.available) {
          await farmer.collection("vegetationObservations").add({ ...vegetation, lat: Number(body.lat), lon: Number(body.lon), collectedAt: now });
        }
      }
    }

    return NextResponse.json({ collected: weatherCollected });
  } catch (error) {
    console.warn("Intelligence collection skipped", error);
    return NextResponse.json({ collected: false });
  }
}
