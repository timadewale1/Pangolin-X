type VegetationSnapshot =
  | { available: false; reason: "not_configured" | "unavailable" }
  | { available: true; ndvi: number; observedRange: { from: string; to: string }; source: "Sentinel-2 L2A"; method: "farm-point sample" };

let tokenCache: { token: string; expiresAt: number } | null = null;

async function accessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const clientId = process.env.SENTINELHUB_CLIENT_ID;
  const clientSecret = process.env.SENTINELHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const response = await fetch("https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  const data = await response.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  tokenCache = { token: data.access_token, expiresAt: Date.now() + Math.max(60, Number(data.expires_in ?? 300)) * 1000 };
  return tokenCache.token;
}

function firstNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstNumber(item);
      if (found !== null) return found;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const found = firstNumber(item);
      if (found !== null) return found;
    }
  }
  return null;
}

export async function fetchSentinelVegetation(lat: number, lon: number): Promise<VegetationSnapshot> {
  const token = await accessToken();
  if (!token) return { available: false, reason: "not_configured" };
  const to = new Date();
  const from = new Date(to.getTime() - 21 * 24 * 60 * 60 * 1000);
  const delta = 0.0015;
  const response = await fetch("https://sh.dataspace.copernicus.eu/process/v1", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        bounds: { bbox: [lon - delta, lat - delta, lon + delta, lat + delta] },
        data: [{ type: "sentinel-2-l2a", dataFilter: { timeRange: { from: from.toISOString(), to: to.toISOString() }, maxCloudCoverage: 40 } }],
      },
      output: { width: 1, height: 1, responses: [{ identifier: "default", format: { type: "application/json" } }] },
      evalscript: "//VERSION=3\nfunction setup(){return {input:[{bands:[\"B04\",\"B08\"]}],output:{bands:1,sampleType:\"FLOAT32\"}}}\nfunction evaluatePixel(s){return [(s.B08-s.B04)/(s.B08+s.B04)]}",
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return { available: false, reason: "unavailable" };
  const ndvi = firstNumber(await response.json());
  if (ndvi === null || ndvi < -1 || ndvi > 1) return { available: false, reason: "unavailable" };
  return { available: true, ndvi, observedRange: { from: from.toISOString(), to: to.toISOString() }, source: "Sentinel-2 L2A", method: "farm-point sample" };
}
