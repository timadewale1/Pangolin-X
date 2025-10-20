import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const keyRaw = process.env.SERVICE_ACCOUNT_KEY;
    if (!keyRaw) throw new Error('Missing SERVICE_ACCOUNT_KEY env variable');
    const serviceAccount = JSON.parse(keyRaw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as unknown as admin.ServiceAccount),
    });
  } catch (err) {
    console.error("Failed to initialize firebase-admin (delete-farmer):", err);
  }
}

if (!admin.apps.length) {
  try {
    const keyRaw = process.env.SERVICE_ACCOUNT_KEY;
    if (!keyRaw) throw new Error('Missing SERVICE_ACCOUNT_KEY env variable');
    const serviceAccount = JSON.parse(keyRaw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as unknown as admin.ServiceAccount),
    });
  } catch (err) {
    console.error("Failed to initialize firebase-admin (delete-farmer):", err);
  }
}

const db = admin.firestore();

export async function POST(req: Request) {
  try {
    // protect endpoint with a shared secret header
    const secret = process.env.ADMIN_SECRET;
    const provided = req.headers.get('x-admin-secret');
    if (!secret || !provided || provided !== secret) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const { uid } = body;
    if (!uid) return NextResponse.json({ success: false, message: 'uid required' }, { status: 400 });

    const result: { authDeleted?: boolean; docDeleted?: boolean } = {};

    // Attempt to delete the Firebase Auth user first. If the user doesn't exist,
    // continue and still attempt to remove the Firestore document.
    try {
      await admin.auth().deleteUser(uid);
      result.authDeleted = true;
    } catch (err: unknown) {
      // If the user wasn't found, that's fine — we'll still try to delete the doc.
      const e = err as { code?: string; message?: string } | undefined;
      if (e?.code === 'auth/user-not-found' || e?.message?.includes('no user record')) {
        result.authDeleted = false;
        console.warn(`Auth user ${uid} not found during rollback.`);
      } else {
        // Log the error but continue to attempt doc deletion.
        console.error('Failed to delete auth user during rollback:', err);
        result.authDeleted = false;
      }
    }

    // Delete the farmer document in Firestore (best-effort).
    try {
      await db.collection('farmers').doc(uid).delete();
      result.docDeleted = true;
    } catch (err) {
      console.error('Failed to delete farmer document during rollback:', err);
      result.docDeleted = false;
      return NextResponse.json({ success: false, message: 'Failed to delete farmer doc', details: result }, { status: 500 });
    }

    return NextResponse.json({ success: true, details: result });
  } catch (err) {
    console.error('delete-farmer failed:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
