import GeoTIFF from 'geotiff';

type OlmResult = {
  clay?: number | null;
  sand?: number | null;
  silt?: number | null;
  ph?: number | null;
  soc?: number | null;
  bulk_density?: number | null;
  texture?: number | null;
  raw?: Record<string, unknown>;
};

const LAYER_MAP: Record<string, string> = {
  clay: 'OpenLandMap:CLYPPT_M_sl1_250m',
  sand: 'OpenLandMap:SNDPP_M_sl1_250m',
  silt: 'OpenLandMap:SLTPPT_M_sl1_250m',
  ph: 'OpenLandMap:PHIHOX_M_sl1_250m',
  soc: 'OpenLandMap:OCSTHA_M_sl1_250m',
  bulk_density: 'OpenLandMap:BLD_M_sl1_250m',
  texture: 'OpenLandMap:USDA_TT_M_sl1_250m',
};

const BASE = process.env.OPENLANDMAP_WCS_BASE ?? 'https://maps.opengeohub.org/geoserver/ows';

async function fetchLayerValue(layerId: string, lat: number, lon: number): Promise<number | null> {
  // Try a few strategies: direct lat/lon, swapped lon/lat (some services expect order),
  // and small offsets to account for pixel-centering issues. Return first valid numeric value.
  const attempts: Array<{ lat: number; lon: number; label: string }> = [
    { lat, lon, label: 'direct' },
    { lat: lon as unknown as number, lon: lat as unknown as number, label: 'swapped' },
    { lat: lat + 0.0005, lon: lon + 0.0005, label: 'offset1' },
    { lat: lat - 0.0005, lon: lon - 0.0005, label: 'offset2' },
    { lat: lat + 0.0005, lon: lon - 0.0005, label: 'offset3' },
    { lat: lat - 0.0005, lon: lon + 0.0005, label: 'offset4' },
  ];

  for (const a of attempts) {
    try {
      const url = `${BASE}?service=WCS&version=2.0.1&request=GetCoverage&coverageId=${encodeURIComponent(layerId)}&subset=Lat(${a.lat})&subset=Long(${a.lon})&format=image/tiff`;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.warn(`OpenLandMap ${layerId} ${a.label} responded ${res.status}: ${txt}`);
        continue;
      }
      const buf = await res.arrayBuffer();
      const tiff = await GeoTIFF.fromArrayBuffer(buf);
      const image = await tiff.getImage();

      // try to detect nodata from file directory or GDAL metadata
      let nodata: number | null = null;
      try {
        // fileDirectory may contain GDAL_NODATA
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fd: any = (image as any).fileDirectory ?? (image as any).getFileDirectory?.();
        if (fd) {
          const g = fd.GDAL_NODATA ?? fd.NODATA ?? null;
          if (g !== undefined && g !== null) {
            const parsed = Number(g);
            if (!Number.isNaN(parsed)) nodata = parsed;
          }
        }
      } catch {
        // ignore
      }

      const data = await image.readRasters({ interleave: false });
      if (Array.isArray(data) && data.length > 0) {
        const first = (data as any)[0];
        if (Array.isArray(first) && first.length > 0) {
          const val = first[0];
          if (typeof val === 'number' && !Number.isNaN(val)) {
            // treat nodata as null
            if (nodata !== null && val === nodata) {
              console.debug(`OpenLandMap ${layerId} ${a.label} returned nodata value ${nodata}`);
              continue;
            }
            return val;
          }
        }
      }
    } catch (err) {
      console.warn('fetchLayerValue attempt failed', layerId, a.label, err);
      continue;
    }
  }
  // no valid value found
  return null;
}

export async function fetchOpenLandMap(lat: number, lon: number): Promise<OlmResult> {
  const keys = Object.keys(LAYER_MAP) as (keyof typeof LAYER_MAP)[];
  const out: OlmResult = { raw: {} };
  await Promise.all(keys.map(async (k) => {
    const layerId = LAYER_MAP[k];
    const v = await fetchLayerValue(layerId, lat, lon);
    (out as any)[k] = v;
    (out.raw as any)[k] = { layerId, value: v };
  }));
  return out;
}

export { LAYER_MAP };
