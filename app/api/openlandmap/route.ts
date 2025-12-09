import { NextResponse } from 'next/server';
import { fetchOpenLandMap } from '@/lib/openlandmap';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const latS = searchParams.get('lat');
    const lonS = searchParams.get('lon');
    if (!latS || !lonS) return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
    const lat = Number(latS);
    const lon = Number(lonS);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return NextResponse.json({ error: 'Invalid lat/lon' }, { status: 400 });

    const data = await fetchOpenLandMap(lat, lon);
    return NextResponse.json(data);
  } catch (err) {
    console.error('openlandmap route error', err);
    return NextResponse.json({ error: 'OpenLandMap fetch failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // accept JSON body { lat, lon }
  try {
    const body = await req.json();
    const lat = Number(body?.lat);
    const lon = Number(body?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return NextResponse.json({ error: 'Invalid lat/lon' }, { status: 400 });
    const data = await fetchOpenLandMap(lat, lon);
    return NextResponse.json(data);
  } catch (err) {
    console.error('openlandmap post error', err);
    return NextResponse.json({ error: 'OpenLandMap fetch failed' }, { status: 500 });
  }
}
