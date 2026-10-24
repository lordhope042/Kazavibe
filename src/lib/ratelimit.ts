// In-memory limiter: fine for one server process. Use Redis (e.g. Upstash) when you run more than one instance.
const hits = new Map<string, number[]>();
export function hit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr);
  return true;
}
