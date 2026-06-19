export async function geocodeFarmLocation(state?: string | null, lga?: string | null): Promise<{ lat: number; lon: number } | null> {
  const trimmedState = String(state ?? "").trim();
  const trimmedLga = String(lga ?? "").trim();
  if (!trimmedState || !trimmedLga) return null;

  try {
    const q = encodeURIComponent(`${trimmedLga}, ${trimmedState}, Nigeria`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return null;
    const lat = Number(data[0].lat);
    const lon = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}
