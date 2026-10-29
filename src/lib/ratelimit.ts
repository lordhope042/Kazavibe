import { prisma } from './db';

// In-memory limiter: fine for one server process. Use Redis (e.g. Upstash) when you run more than one instance.
const hits = new Map<string, number[]>();
export function hit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr);
  return true;
}

/**
 * Same idea, stored in the database so it still works when the server restarts or runs as many short-lived copies (Vercel).
 * Used for logins, one-time codes, SMS/email sending and payments. If the database is unreachable it falls back to memory
 * rather than locking everybody out.
 */
export async function hitDb(key: string, max: number, windowMs: number) {
  const resetAt = new Date(Date.now() + windowMs).toISOString(), now = new Date().toISOString();
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt}::timestamp)
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimit"."resetAt" < ${now}::timestamp THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now}::timestamp THEN ${resetAt}::timestamp ELSE "RateLimit"."resetAt" END
      RETURNING "count"`;
    return Number(rows[0].count) <= max;
  } catch (e) { console.error('rate limit store failed, using memory', e); return hit(key, max, windowMs); }
}
