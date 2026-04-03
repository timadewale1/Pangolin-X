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
    const out: { classification: unknown | null; properties: Record<string, unknown> | null } = { classification: null, properties: null };

    // Try SoilGrids with up to one retry. Collect errors for logging.
    let sgError: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const clsRes = await fetch(`${base}/classification/query?lat=${lat}&lon=${lon}`);
        if (clsRes.ok) {
          try { out.classification = await clsRes.json(); } catch { out.classification = null; }
        } else {
          const bodyText = await clsRes.text().catch(() => '');
          sgError = { stage: 'classification', status: clsRes.status, text: bodyText };
          console.warn('soil classification proxy non-ok', sgError);
          throw sgError;
        }

        const propRes = await fetch(`${base}/properties/query?lat=${lat}&lon=${lon}`);
        if (propRes.ok) {
          try { out.properties = await propRes.json(); } catch { out.properties = null; }
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

    // If SoilGrids failed, optionally try OpenLandMap fallback if configured
    let usedFallback = false;
    if (!out.classification && !out.properties) {
      try {
        const olm = await fetchOpenLandMap(lat, lon);
        if (olm) {
          // map known keys into properties/classification if possible
          out.properties = out.properties ?? {};
          (out.properties as Record<string, unknown>).openland = olm;
          usedFallback = true;
        }
      } catch (e) {
        console.warn('OpenLandMap helper fallback failed', e);
      }
    }

    // best-effort summary: classification name or properties-derived ph/texture
    const parts: string[] = [];
    // classification shape is dynamic; coerce safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _cls: any = out.classification ?? {};
    if (_cls && Array.isArray(_cls.classes) && _cls.classes.length > 0) {
      const c = _cls.classes[0];
      if (c && c.name) parts.push(c.name);
    } else if (_cls && typeof _cls === 'string') {
      parts.push(_cls as string);
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const P = (out.properties as any)?.properties ?? (out.properties as any) ?? null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstMean = (obj: any) => {
        if (!obj) return undefined;
        if (Array.isArray(obj.values) && obj.values.length > 0 && obj.values[0].mean !== undefined) return obj.values[0].mean;
        if (Array.isArray(obj.depths) && obj.depths.length > 0) {
          const d = obj.depths[0];
          if (d && d.values && Array.isArray(d.values) && d.values[0] && d.values[0].mean !== undefined) return d.values[0].mean;
          if (d && d.value && typeof d.value === 'number') return d.value;
        }
        if (typeof obj.mean === 'number') return obj.mean;
        if (typeof obj === 'number') return obj;
        return undefined;
      };
      if (P) {
        const ph = firstMean(P.phh2o ?? P.phh2o?.[0] ?? P.ph ?? null);
        const sand = firstMean(P.sand ?? null);
        const silt = firstMean(P.silt ?? null);
        const clay = firstMean(P.clay ?? null);
        if (ph !== undefined && ph !== null) parts.push(`pH≈${Math.round(ph * 10) / 10}`);
        const tex: string[] = [];
        if (sand !== undefined && sand !== null) tex.push(`sand ${Math.round(sand)}%`);
        if (silt !== undefined && silt !== null) tex.push(`silt ${Math.round(silt)}%`);
        if (clay !== undefined && clay !== null) tex.push(`clay ${Math.round(clay)}%`);
        if (tex.length) parts.push(tex.join(', '));
      }
    } catch (err) {
      console.warn('summary extraction error', err);
    }

    const summary = parts.length ? parts.join(' · ') : null;

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
