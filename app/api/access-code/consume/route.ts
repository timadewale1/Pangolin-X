import { NextResponse } from "next/server";
import { adminDB } from '@/lib/firebaseAdmin';

const db = adminDB;
const VALID_CODE = "PANGOLIN-X";

export async function POST(req: Request) {
  try {
    // Require an admin secret header to protect this endpoint
    const secret = process.env.ADMIN_SECRET;
    const provided = req.headers.get('x-admin-secret');
    if (!secret || !provided || provided !== secret) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code || code !== VALID_CODE) {
      return NextResponse.json({ success: false, message: "Invalid code" }, { status: 400 });
    }

    const codeRef = db.collection('access_codes').doc(VALID_CODE);

    // Run transaction to atomically check and increment
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(codeRef);
      const data = snap.exists ? snap.data() : {};
      const uses = data?.uses ?? 0;
      const maxUses = data?.maxUses ?? 50;
      if (uses >= maxUses) {
        throw new Error('Code has expired');
      }
      tx.set(codeRef, { uses: uses + 1, lastUsed: new Date().toISOString(), maxUses }, { merge: true });
      return { uses: uses + 1, maxUses };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    console.error('Consume access code failed:', err);
    if (err instanceof Error) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
