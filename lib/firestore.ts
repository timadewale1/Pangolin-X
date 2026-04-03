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

// Common fields shared between regular and forecast advisories
interface BaseAdvisoryData {
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
// Regular advisory with immediate advice
export interface AdvisoryData extends BaseAdvisoryData {
  // Primary textual advisory produced by the AI / generator. Some code uses
  // `advice` while other callers may use `advisory` — accept both to be
  // forgiving during migration.
  advice?: string;
  advisory?: string;
  header?: string;
  details?: unknown;
}

// Forecast advisory with future date and recommendations
export interface ForecastAdvisoryData extends BaseAdvisoryData {
  // The forecasted date this advisory applies to
  forecastDate: string;
  
  // The advisory text for the forecast date
  advice: string;
  header?: string;
  details?: unknown;
  
  // Original forecast weather data that was used
  forecastWeather: Record<string, unknown>;
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
// Add forecast advisory
export async function addForecastAdvisory(uid: string, data: ForecastAdvisoryData) {
  const ref = collection(db, "farmers", uid, "forecastAdvisories");
  await addDoc(ref, { ...data, createdAt: serverTimestamp() });
}

export async function fetchAdvisories(uid: string, count: number = 10) {
  const ref = collection(db, "farmers", uid, "advisories");
  const q = query(ref, orderBy("createdAt", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Fetch forecast advisories for a specific date range
export async function fetchForecastAdvisories(uid: string, fromDate: Date, toDate: Date, count: number = 10) {
  const ref = collection(db, "farmers", uid, "forecastAdvisories");
  const q = query(
    ref,
    // Filter to forecasts within the date range
    orderBy("forecastDate"),
    // Use .where() after orderBy() for range queries
    // Convert dates to ISO strings for comparison
    limit(count)
  );
  const snap = await getDocs(q);
  
  // Filter client-side since Firestore doesn't support string range comparisons well
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() as ForecastAdvisoryData }))
    .filter((doc) => {
      const forecastDate = new Date(doc.forecastDate);
      return forecastDate >= fromDate && forecastDate <= toDate;
    });
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

// Soil type interface - key is 'state|LGA' to avoid duplicate LGA names across states
interface SoilTypeData {
  type: string;  // primary soil type
  description?: string;  // optional detailed description
  nutrients?: {  // optional nutrient levels
    nitrogen?: 'low' | 'medium' | 'high';
    phosphorus?: 'low' | 'medium' | 'high';
    potassium?: 'low' | 'medium' | 'high';
  };
  traits?: {  // optional soil characteristics
    pH?: number;
    drainage?: 'poor' | 'moderate' | 'good';
    texture?: 'sandy' | 'silty' | 'clay' | 'loam' | 'mixed';
  };
}

// Helper: Get soil type for a given state and LGA
export async function getSoilType(state: string, lga: string): Promise<SoilTypeData | null> {
  if (!state || !lga) return null;
  const key = `${state}|${lga}`.toLowerCase();
  const ref = doc(db, 'soilTypes', key);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return null;
  }
  return snap.data() as SoilTypeData;
}

// Helper: Set soil type for a given state and LGA
export async function setSoilType(state: string, lga: string, data: SoilTypeData) {
  if (!state || !lga) throw new Error('State and LGA required');
  const key = `${state}|${lga}`.toLowerCase();
  const ref = doc(db, 'soilTypes', key);
  await setDoc(ref, data);
}
