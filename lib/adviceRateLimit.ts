const WINDOW_MS = 30 * 60 * 1000;
const MAX_REQUESTS = 3;
const requests = new Map<string, number[]>();

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
