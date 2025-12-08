import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const uid = body?.uid;
    const soil = body?.soil ?? null;
    const soilSummary = body?.soilSummary ?? null;

    if (!uid || typeof uid !== 'string') {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    if (!adminDB || typeof adminDB.doc !== 'function') {
      return NextResponse.json({ error: 'Server firebase admin not initialized' }, { status: 500 });
    }

    const ref = adminDB.doc(`farmers/${uid}`);
    // Use update to avoid overwriting the farmer doc if it exists
    await ref.update({ soil: soil, soilSummary: soilSummary });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('soil save error', err);
    return NextResponse.json({ error: 'Failed to save soil data' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
