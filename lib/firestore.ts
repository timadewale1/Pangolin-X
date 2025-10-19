import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Advisory data interface
// AdvisoryData represents the shape of an advisory document stored under
// `farmers/{uid}/advisories`. Fields are optional where callers may omit
// them (serverTimestamp is added by `addAdvisory`). Keep this in sync with
// any server-side functions that read/write advisories.
export interface AdvisoryData {
  // Primary textual advisory produced by the AI / generator. Some code uses
  // `advice` while other callers may use `advisory` — accept both to be
  // forgiving during migration.
  advice?: string;
  advisory?: string;

  // Optional human-friendly title or short summary
  title?: string;

  // Optional structured weather data included when the advisory was generated
  weather?: Record<string, unknown> | null;

  // List of crop ids the advisory applies to
  crops?: string[];

  // createdAt is added by serverTimestamp() on write, but allow callers to
  // provide it for testing or migrations.
  createdAt?: unknown;
}

// Add new advisory
export async function addAdvisory(uid: string, data: AdvisoryData) {
  const ref = collection(db, "farmers", uid, "advisories");
  await addDoc(ref, { ...data, createdAt: serverTimestamp() });
}

// Add fragility advisory (separate collection)
// Structured fragility advisory type
export interface FragilityAdvisoryData {
  header: string;
  sections: { title: string; summary: string; severity: "low" | "moderate" | "high" }[];
  weather?: Record<string, unknown> | null;
  createdAt?: unknown;
}

export async function addFragilityAdvisory(uid: string, data: FragilityAdvisoryData) {
  const ref = collection(db, "farmers", uid, "fragility");
  await addDoc(ref, { ...data, createdAt: serverTimestamp() });
}

// Fetch advisory history (latest first)
export async function fetchAdvisories(uid: string, count: number = 10) {
  const ref = collection(db, "farmers", uid, "advisories");
  const q = query(ref, orderBy("createdAt", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Fetch fragility advisory history
export async function fetchFragilityAdvisories(uid: string, count: number = 10) {
  const ref = collection(db, "farmers", uid, "fragility");
  const q = query(ref, orderBy("createdAt", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as FragilityAdvisoryData) }));
}

// Update crop list for a farmer
export async function updateFarmerCrops(uid: string, crops: string[]) {
  const ref = doc(db, "farmers", uid);
  await updateDoc(ref, { crops });
}

// Update crop status (stage/plantedAt)
export async function updateFarmerCropStatus(
  uid: string,
  cropId: string,
  status: { stage?: string; plantedAt?: string }
) {
  const ref = doc(db, "farmers", uid);
  const field = `cropStatus.${cropId}`;
  await updateDoc(ref, { [field]: status });
}

// Fetch farmer details
export async function getFarmer(uid: string) {
  const ref = doc(db, "farmers", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// Farmer data interface
export interface FarmerData {
  name: string;
  email: string;
  crops?: string[];
  // Add other fields as needed
}

// Create farmer record (used on signup)
export async function createFarmer(uid: string, data: FarmerData) {
  const ref = doc(db, "farmers", uid);
  await setDoc(ref, { ...data, createdAt: serverTimestamp() });
}
