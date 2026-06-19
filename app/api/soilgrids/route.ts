// Server-side proxy for SoilGrids REST (classification + properties)
// Implements simple in-memory caching to reduce calls to ISRIC and respect fair-use.
import { fetchOpenLandMap } from '@/lib/openlandmap';
type CacheEntry = { ts: number; data: unknown };
const CACHE = new Map<string, CacheEntry>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lat = Number(body?.lat);
    const lon = Number(body?.lon);
    // Accept 0 coordinates; ensure lat/lon are finite numbers
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return new Response(JSON.stringify({ error: 'lat and lon required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // normalize coordinates for cache key to avoid long floats
    const key = `${lat.toFixed(6)}:${lon.toFixed(6)}`;
    const now = Date.now();
    const cached = CACHE.get(key);
    if (cached && (now - cached.ts) < TTL) {
      return new Response(JSON.stringify(cached.data), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const base = 'https://rest.isric.org/soilgrids/v2.0';
    const out: { classification: Record<string, unknown> | null; properties: Record<string, unknown> | null } = { classification: null, properties: null };

    // Try SoilGrids with up to one retry. Collect errors for logging.
    let sgError: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const clsRes = await fetch(`${base}/classification/query?lat=${lat}&lon=${lon}`);
        if (clsRes.ok) {
          try { out.classification = await clsRes.json(); } catch (e) { out.classification = null; }
        } else {
          const bodyText = await clsRes.text().catch(() => '');
          sgError = { stage: 'classification', status: clsRes.status, text: bodyText };
          console.warn('soil classification proxy non-ok', sgError);
          throw sgError;
        }

        const propRes = await fetch(`${base}/properties/query?lat=${lat}&lon=${lon}`);
        if (propRes.ok) {
          try { out.properties = await propRes.json(); } catch (e) { out.properties = null; }
        } else {
          const bodyText = await propRes.text().catch(() => '');
          sgError = { stage: 'properties', status: propRes.status, text: bodyText };
          console.warn('soil properties proxy non-ok', sgError);
          throw sgError;
        }

        // success: break retry loop
        sgError = null;
        break;
      } catch (e) {
        console.warn(`SoilGrids attempt ${attempt} failed:`, e);
        sgError = e;
        // small delay before retry
        if (attempt < 2) await new Promise((r) => setTimeout(r, 300));
      }
    }

    let usedFallback = false;

    const firstNumericValue = (values: Record<string, unknown> | undefined) => {
      if (!values) return undefined;
      for (const key of ["mean", "Q0.5", "Q0_5", "median"]) {
        const raw = values[key];
        const num = typeof raw === "number" ? raw : Number(raw);
        if (Number.isFinite(num)) return num;
      }
      return undefined;
    };

    const firstDepthMean = (layer: Record<string, unknown> | undefined) => {
      if (!layer) return undefined;
      const depths = Array.isArray(layer.depths) ? layer.depths as Array<Record<string, unknown>> : [];
      for (const depth of depths) {
        const values = depth.values as Record<string, unknown> | undefined;
        const numeric = firstNumericValue(values);
        if (numeric !== undefined) return numeric;
      }
      return undefined;
    };

    // best-effort summary: classification name or properties-derived ph/texture
    const parts: string[] = [];
    const clsName = out.classification?.wrb_class_name ?? out.classification?.soil_class_name ?? out.classification?.name;
    if (typeof clsName === 'string' && clsName.trim()) parts.push(clsName.trim());
    else {
      const clsList = out.classification?.wrb_class_probability;
      if (Array.isArray(clsList) && Array.isArray(clsList[0]) && clsList[0][0]) {
        parts.push(String(clsList[0][0]));
      }
    }

    try {
      const layers = Array.isArray(out.properties?.layers) ? out.properties!.layers as Array<Record<string, unknown>> : [];
      const getLayer = (name: string) => layers.find((layer) => String(layer.name ?? "").toLowerCase() === name);
      const ph = firstDepthMean(getLayer("phh2o"));
      const sand = firstDepthMean(getLayer("sand"));
      const silt = firstDepthMean(getLayer("silt"));
      const clay = firstDepthMean(getLayer("clay"));
      if (ph !== undefined && ph !== null) parts.push(`pH~${Math.round(ph * 10) / 10}`);
      const tex: string[] = [];
      if (sand !== undefined && sand !== null) tex.push(`sand ${Math.round(sand)}%`);
      if (silt !== undefined && silt !== null) tex.push(`silt ${Math.round(silt)}%`);
      if (clay !== undefined && clay !== null) tex.push(`clay ${Math.round(clay)}%`);
        if (tex.length) parts.push(tex.join(', '));

      if (ph === undefined || sand === undefined || silt === undefined || clay === undefined) {
        try {
          const olm = await fetchOpenLandMap(lat, lon);
          if (olm) {
            out.properties = out.properties ?? {};
            (out.properties as Record<string, unknown>).openland = olm;
            usedFallback = true;
            const olmParts: string[] = [];
            if (ph === undefined && typeof olm.ph === "number") olmParts.push(`pH~${Math.round(olm.ph * 10) / 10}`);
            if (sand === undefined && typeof olm.sand === "number") olmParts.push(`sand ${Math.round(olm.sand)}%`);
            if (silt === undefined && typeof olm.silt === "number") olmParts.push(`silt ${Math.round(olm.silt)}%`);
            if (clay === undefined && typeof olm.clay === "number") olmParts.push(`clay ${Math.round(olm.clay)}%`);
            if (olmParts.length) parts.push(olmParts.join(', '));
          }
        } catch (e) {
          console.warn('OpenLandMap helper fallback failed', e);
        }
      }
    } catch (err) {
      console.warn('summary extraction error', err);
    }

    const summary = parts.length ? parts.join(' | ') : null;

    // If we have no meaningful data from either provider, return cached data if present,
    // otherwise return an error so client can show message. Also include diagnostics.
    const data = { classification: out.classification, properties: out.properties, summary };
    if (!out.classification && !out.properties && !summary) {
      console.warn('Soil data unavailable from SoilGrids and OpenLandMap', { sgError, usedFallback });
      // try cache fallback
      const cachedFallback = CACHE.get(key);
      if (cachedFallback && cachedFallback.data) {
        const fallbackResp = { ...(cachedFallback.data as Record<string, unknown>), diagnostic: { message: 'Returned cached soil data because upstream providers failed', sgError, usedFallback, cachedAt: cachedFallback.ts } };
        return new Response(JSON.stringify(fallbackResp), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'Soil data unavailable', diagnostic: { sgError, usedFallback } }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }
    
    // store and return
    CACHE.set(key, { ts: now, data });
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('soil route error', err);
    return new Response(JSON.stringify({ error: 'bad request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
