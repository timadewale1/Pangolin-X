import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const keyRaw = process.env.SERVICE_ACCOUNT_KEY;
    if (!keyRaw) throw new Error('Missing SERVICE_ACCOUNT_KEY env variable');
    const serviceAccount = JSON.parse(keyRaw);

    // 👇 Convert escaped newlines back to real ones
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (err) {
    console.error('Failed to init firebase-admin (consume-client):', err);
  }
}
const db = admin.firestore();
const VALID_CODE = 'PANGOLIN-X';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ success: false, message: 'Missing token' }, { status: 401 });
    const idToken = authHeader.split(' ')[1];
  const decoded = await admin.auth().verifyIdToken(idToken);
  const uid = decoded.uid;
  const userEmail = decoded.email ?? null;

    const body = await req.json();
    const { code } = body;
    if (!code || code !== VALID_CODE) return NextResponse.json({ success: false, message: 'Invalid code' }, { status: 400 });

    const codeRef = db.collection('access_codes').doc(VALID_CODE);
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(codeRef);
      const data = snap.exists ? snap.data() : {};
      const uses = data?.uses ?? 0;
      const maxUses = data?.maxUses ?? 50;
      if (uses >= maxUses) throw new Error('Code has expired');
      tx.set(codeRef, { uses: uses + 1, lastUsed: new Date().toISOString(), maxUses }, { merge: true });
      // write a use record for auditing
      const useRef = codeRef.collection('uses').doc(uid);
      tx.set(useRef, { uid, email: userEmail, usedAt: new Date().toISOString() }, { merge: true });
      return { uses: uses + 1, maxUses };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('consume-client failed:', err);
    return NextResponse.json({ success: false, message: (err instanceof Error) ? err.message : 'Server error' }, { status: 500 });
  }
}
