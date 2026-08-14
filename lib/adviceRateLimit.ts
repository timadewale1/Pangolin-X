const WINDOW_MS = 30 * 60 * 1000;
const MAX_REQUESTS = 3;
const requests = new Map<string, number[]>();
import { adminDB } from "@/lib/firebaseAdmin";

/** Best-effort server-side cost guard for advisory generation. */
export function takeAdviceRequest(key: string) {
  const now = Date.now();
  const recent = (requests.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    requests.set(key, recent);
    return { allowed: false, retryAfterSeconds: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  requests.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function takeDurableAdviceRequest(key: string) {
  if (!adminDB) return takeAdviceRequest(key);
  const ref = adminDB.collection("advisoryRateLimits").doc(key.replace(/[^a-zA-Z0-9_-]/g, "_")); const now = Date.now();
  return adminDB.runTransaction(async (transaction) => { const snap = await transaction.get(ref); const recent = ((snap.data()?.requests as number[] | undefined) ?? []).filter((time) => now - time < WINDOW_MS); if (recent.length >= MAX_REQUESTS) return { allowed: false, retryAfterSeconds: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000) }; recent.push(now); transaction.set(ref, { requests: recent, updatedAt: now }); return { allowed: true, retryAfterSeconds: 0 }; });
}
