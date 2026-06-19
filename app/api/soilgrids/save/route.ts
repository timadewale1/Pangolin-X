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
    const safeSoil = soil == null ? null : JSON.parse(JSON.stringify(soil));
    const safeSummary = typeof soilSummary === 'string' ? soilSummary : soilSummary == null ? null : String(soilSummary);

    // Use merge set so the write succeeds even if the farmer document is missing.
    // Also normalize the payload to plain JSON so Firestore does not see non-serializable nested entities.
    await ref.set({ soil: safeSoil, soilSummary: safeSummary }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('soil save error', err);
    return NextResponse.json({ error: 'Failed to save soil data' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
