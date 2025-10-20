import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const keyPath = path.join(process.cwd(), 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('serviceAccountKey.json not found in project root');
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function create() {
  const code = 'PANGOLIN-X';
  const docRef = db.collection('access_codes').doc(code);
  await docRef.set({ uses: 0, maxUses: 50, createdAt: new Date().toISOString() }, { merge: true });
  console.log('Created access_codes/' + code);
  process.exit(0);
}

create().catch((e) => { console.error(e); process.exit(1); });
