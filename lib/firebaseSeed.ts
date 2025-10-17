// lib/firebaseSeed.ts
/**
 * Usage:
 * 1. npm install firebase-admin
 * 2. Place serviceAccountKey.json at project root (download from Firebase Console)
 * 3. node ./lib/firebaseSeed.ts
 */
import * as admin from "firebase-admin";
import { NIGERIA_STATES_LGAS } from "./nigeriaData";

import serviceAccount from "../serviceAccountKey.json";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore();

async function seedStates() {
  const batch = db.batch();
  const ref = db.collection("locations").doc("nigeria");
  await ref.set({ updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  const statesRef = ref.collection("states");
  for (const [state, lgas] of Object.entries(NIGERIA_STATES_LGAS)) {
    const sDoc = statesRef.doc(state);
    batch.set(sDoc, { name: state, lgas });
  }
  await batch.commit();
  console.log("Seeded states & LGAs to /locations/nigeria/states");
}

async function seedCrops() {
  const cropList = [
    { id: "maize", label: "Maize" },
    { id: "cassava", label: "Cassava" },
    { id: "rice", label: "Rice" },
    { id: "cowpea", label: "Cowpea" },
    { id: "yam", label: "Yam" },
    { id: "groundnut", label: "Groundnut" },
    { id: "soybean", label: "Soybean" },
    { id: "millet", label: "Millet" },
    // add others...
  ];
  const batch = db.batch();
  const cropsRef = db.collection("meta").doc("crops").collection("list");
  for (const crop of cropList) {
    batch.set(cropsRef.doc(crop.id), crop);
  }
  await batch.commit();
  console.log("Seeded crops");
}

async function run() {
  await seedStates();
  await seedCrops();
  console.log("Seeding complete");
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
