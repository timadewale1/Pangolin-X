type CatalogEntry = { identifier: number; name: string };
type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;
let catalogCache: { expiresAt: number; datasets: CatalogEntry[]; properties: CatalogEntry[] } | null = null;

const API = "https://api.soilhive.ag/v1";
const TOKEN = "https://auth.soilhive.ag/oauth/token";
const DAY = 24 * 60 * 60 * 1000;

function records(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(records);
  if (!value || typeof value !== "object") return [];
  const object = value as Record<string, unknown>; const direct = typeof object.identifier === "number" && typeof object.name === "string" ? [object] : [];
  return [...direct, ...Object.values(object).flatMap(records)];
}

async function accessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;
  const supplied = process.env.SOILHIVE_ACCESS_TOKEN?.trim();
  if (supplied) { tokenCache = { token: supplied, expiresAt: Date.now() + 5 * 60 * 1000 }; return supplied; }
  const clientId = process.env.SOILHIVE_CLIENT_ID?.trim(); const clientSecret = process.env.SOILHIVE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("SoilHive credentials are not configured.");
  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret, audience: "https://api.soilhive.ag/" });
  const response = await fetch(TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`SoilHive authentication failed (${response.status}).`);
  const data = await response.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("SoilHive did not return an access token.");
  tokenCache = { token: data.access_token, expiresAt: Date.now() + Math.max(60, Number(data.expires_in ?? 300) - 60) * 1000 }; return data.access_token;
}

async function soilHiveFetch(path: string, init?: RequestInit) {
  const token = await accessToken(); const response = await fetch(`${API}${path}`, { ...init, headers: { Accept: "application/ld+json, application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`SoilHive request failed (${response.status}).`); return response.json();
}

function select(entries: CatalogEntry[], patterns: RegExp[]) { return entries.filter((entry) => patterns.some((pattern) => pattern.test(entry.name))).map((entry) => entry.identifier); }
async function catalog() {
  if (catalogCache && catalogCache.expiresAt > Date.now()) return catalogCache;
  const [datasetsResponse, propertiesResponse] = await Promise.all([soilHiveFetch("/datasets"), soilHiveFetch("/soil-properties")]);
  const toEntries = (value: unknown) => records(value).map((item) => ({ identifier: Number(item.identifier), name: String(item.name) })).filter((item) => Number.isInteger(item.identifier));
  catalogCache = { expiresAt: Date.now() + DAY, datasets: toEntries(datasetsResponse), properties: toEntries(propertiesResponse) }; return catalogCache;
}

function rowValues(data: unknown) {
  const result: Array<Record<string, string | number>> = [];
  const walk = (value: unknown) => { if (Array.isArray(value)) { value.forEach(walk); return; } if (!value || typeof value !== "object") return; const object = value as Record<string, unknown>; if (Array.isArray(object.item)) { const row: Record<string, string | number> = {}; for (const cell of object.item as Array<Record<string, unknown>>) if (typeof cell.name === "string" && (typeof cell.value === "string" || typeof cell.value === "number")) row[cell.name] = cell.value; if (Object.keys(row).length) result.push(row); } Object.values(object).forEach(walk); };
  walk(data); return result;
}
function rowFor(rows: Array<Record<string, string | number>>, terms: RegExp[]) {
  return rows.filter((item) => terms.some((term) => term.test(String(item.Property ?? item.property ?? "")))).sort((a, b) => {
    const score = (item: Record<string, string | number>) => (String(item.Depth ?? "") === "0-5" ? 4 : 0) + (/_mean$/i.test(String(item.Property ?? "")) ? 2 : 0);
    return score(b) - score(a);
  })[0];
}
function numberFor(rows: Array<Record<string, string | number>>, terms: RegExp[], scale?: (value: number, row: Record<string, string | number>) => number) { const row = rowFor(rows, terms); const value = row?.Value ?? row?.value; const number = typeof value === "number" ? value : Number(value); return Number.isFinite(number) ? (scale ? scale(number, row ?? {}) : number) : null; }

export async function fetchSoilHive(lat: number, lon: number) {
  const dataCatalog = await catalog();
  const datasetIds = select(dataCatalog.datasets, [/isda/i, /soilgrids/i]).slice(0, 4);
  const propertyIds = select(dataCatalog.properties, [/\bph\b/i, /acidity/i, /sand/i, /silt/i, /clay/i, /organic carbon/i, /bulk density/i, /nitrogen/i, /phosphorus/i, /potassium/i]).slice(0, 20);
  if (!datasetIds.length) throw new Error("SoilHive does not expose a supported soil dataset for this account.");
  const payload = { geometry: `POINT (${lon} ${lat})`, datasets: datasetIds, ...(propertyIds.length ? { soilProperties: propertyIds } : {}) };
  const raw = await soilHiveFetch("/soil-data-by-geometry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const rows = rowValues(raw); const pH = numberFor(rows, [/\bph/i, /acidity/i], (value) => value > 14 ? value / 10 : value); const texture = (value: number) => value > 100 ? value / 10 : value; const sand = numberFor(rows, [/sand/i], texture); const silt = numberFor(rows, [/silt/i], texture); const clay = numberFor(rows, [/clay/i], texture); const organicCarbon = numberFor(rows, [/organic carbon/i, /\bsoc\b/i]);
  const parts = [pH !== null ? `pH~${Math.round(pH * 10) / 10}` : null, sand !== null ? `sand ${Math.round(sand)}%` : null, silt !== null ? `silt ${Math.round(silt)}%` : null, clay !== null ? `clay ${Math.round(clay)}%` : null, organicCarbon !== null ? `organic carbon ${Math.round(organicCarbon * 100) / 100}` : null].filter(Boolean);
  const measurements = [rowFor(rows, [/\bph/i, /acidity/i]), rowFor(rows, [/sand/i]), rowFor(rows, [/silt/i]), rowFor(rows, [/clay/i]), rowFor(rows, [/organic carbon/i, /\bsoc\b/i])].filter(Boolean);
  return { source: "soilhive", provider: "SoilHive", fetchedAt: new Date().toISOString(), coordinates: { lat, lon }, pH, sand, silt, clay, organicCarbon, summary: parts.length ? parts.join(" | ") : "SoilHive location profile is ready; detailed values are limited for this location.", measurements };
}
