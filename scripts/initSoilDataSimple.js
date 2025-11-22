// scripts/initSoilDataSimple.js
// Lightweight Node script to populate `soilTypes` collection using Firebase Admin SDK
// Uses ESM-style imports to satisfy lint rules that forbid require().

import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');

let serviceAccount;
try {
  const raw = fs.readFileSync(keyPath, 'utf8');
  serviceAccount = JSON.parse(raw);
} catch (err) {
  console.error('Cannot find or parse serviceAccountKey.json at', keyPath);
  console.error('Please place your Firebase service account JSON at that location.');
  console.error(err);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Sample soil data (same example set as initSoilData.ts)
const soilData = {
  // Kano State
  'kano|dambatta': {
    type: 'Sandy Loam',
    description: 'Well-drained sandy loam soil suitable for cereals and vegetables',
    traits: { texture: 'sandy', drainage: 'good', pH: 6.5 },
    nutrients: { nitrogen: 'medium', phosphorus: 'low', potassium: 'medium' },
  },
  'kano|kura': {
    type: 'Clay Loam',
    description: 'Heavy clay loam soil with high water retention',
    traits: { texture: 'clay', drainage: 'moderate', pH: 7.2 },
    nutrients: { nitrogen: 'high', phosphorus: 'medium', potassium: 'high' },
  },
  // Ogun State
  'ogun|obafemi owode': {
    type: 'Forest Soil',
    description: 'Rich forest soil with high organic content',
    traits: { texture: 'loam', drainage: 'good', pH: 6.8 },
    nutrients: { nitrogen: 'high', phosphorus: 'high', potassium: 'medium' },
  },
  // Kaduna State
  'kaduna|zaria': {
    type: 'Northern Guinea Savanna Soil',
    description: 'Typical savanna soil suitable for grains and legumes',
    traits: { texture: 'sandy', drainage: 'good', pH: 6.3 },
    nutrients: { nitrogen: 'low', phosphorus: 'medium', potassium: 'medium' },
  },
};

async function initSoilData() {
  console.log('Starting soil data initialization...');
  for (const [key, data] of Object.entries(soilData)) {
    try {
      const ref = db.collection('soilTypes').doc(key);
      await ref.set(data);
      console.log(`Added soil data for ${key}`);
    } catch (err) {
      console.error(`Failed to add soil data for ${key}:`, err);
    }
  }

  console.log('Soil data initialization complete.');
  process.exit(0);
}

initSoilData().catch((err) => {
  console.error('Initialization failed:', err);
  process.exit(1);
});
