import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const keyRaw = process.env.SERVICE_ACCOUNT_KEY;
    if (!keyRaw) throw new Error('Missing SERVICE_ACCOUNT_KEY env variable');
    const serviceAccount = JSON.parse(keyRaw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as unknown as admin.ServiceAccount),
    });
  } catch (err) {
    console.error('Failed to init firebase-admin (delete-farmer-client):', err);
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
    console.error('Failed to init firebase-admin (delete-farmer-client):', err);
  }
}

const db = admin.firestore();

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ success: false, message: 'Missing token' }, { status: 401 });
    const idToken = authHeader.split(' ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // delete farmer doc
    const result: { authDeleted?: boolean; docDeleted?: boolean } = {};
    try {
      await admin.auth().deleteUser(uid);
      result.authDeleted = true;
    } catch (err) {
      console.warn('Auth delete may have failed or user not found', err);
      result.authDeleted = false;
    }
    try {
      await db.collection('farmers').doc(uid).delete();
      result.docDeleted = true;
    } catch (err) {
      console.error('Failed to delete farmer doc', err);
      result.docDeleted = false;
    }

    return NextResponse.json({ success: true, details: result });
  } catch (err) {
    console.error('delete-farmer-client failed:', err);
    return NextResponse.json({ success: false, message: (err instanceof Error) ? err.message : 'Server error' }, { status: 500 });
  }
}
