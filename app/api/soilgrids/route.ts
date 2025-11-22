// Server-side proxy for SoilGrids REST (classification + properties)
// Implements simple in-memory caching to reduce calls to ISRIC and respect fair-use.
type CacheEntry = { ts: number; data: unknown };
const CACHE = new Map<string, CacheEntry>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lat = Number(body?.lat);
    const lon = Number(body?.lon);
    if (!lat || !lon) return new Response(JSON.stringify({ error: 'lat and lon required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const key = `${lat}:${lon}`;
    const now = Date.now();
    const cached = CACHE.get(key);
    if (cached && (now - cached.ts) < TTL) {
      return new Response(JSON.stringify(cached.data), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const base = 'https://rest.isric.org/soilgrids/v2.0';
  const out: { classification: unknown | null; properties: unknown | null } = { classification: null, properties: null };
    try {
      const cls = await fetch(`${base}/classification/query?lat=${lat}&lon=${lon}`);
      if (cls.ok) out.classification = await cls.json();
    } catch (e) {
      // swallow; return what we have
      console.warn('soil classification proxy failed', e);
    }
    try {
      const p = await fetch(`${base}/properties/query?lat=${lat}&lon=${lon}`);
      if (p.ok) out.properties = await p.json();
    } catch (e) {
      console.warn('soil properties proxy failed', e);
    }

    // best-effort summary: classification name or properties-derived ph/texture
    const parts: string[] = [];
    // classification shape is dynamic; coerce safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _cls: any = out.classification ?? {};
    if (_cls && Array.isArray(_cls.classes) && _cls.classes.length > 0) {
      const c = _cls.classes[0];
      if (c && c.name) parts.push(c.name);
    }
    try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = (out.properties as any)?.properties ?? null;
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
        return undefined;
      };
      if (P) {
        const ph = firstMean(P.phh2o ?? P.phh2o?.[0] ?? null);
        const sand = firstMean(P.sand ?? null);
        const silt = firstMean(P.silt ?? null);
        const clay = firstMean(P.clay ?? null);
        if (ph !== undefined) parts.push(`pH≈${Math.round(ph * 10) / 10}`);
        const tex: string[] = [];
        if (sand !== undefined) tex.push(`sand ${Math.round(sand)}%`);
        if (silt !== undefined) tex.push(`silt ${Math.round(silt)}%`);
        if (clay !== undefined) tex.push(`clay ${Math.round(clay)}%`);
        if (tex.length) parts.push(tex.join(', '));
      }
    } catch {
      // ignore summary extraction errors
    }

    const summary = parts.length ? parts.join(' · ') : null;
    const data = { classification: out.classification, properties: out.properties, summary };
    CACHE.set(key, { ts: now, data });
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch {
      return new Response(JSON.stringify({ error: 'bad request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
}

export async function GET() {
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
