import { prisma } from './db';

type U = { plan: 'FREE' | 'PLUS'; planExpiresAt: Date | null };
/** Single source of truth for paid features. Always check on the server, never trust the client. */
/** Test-period switch: while on, every account gets all Plus features for free. The paywall returns by itself after the date below, or immediately with PLUS_FREE_FOR_ALL=false in .env. */
/** Test period: free Plus for everyone until this moment (default 8 Nov 2026, end of day Nigeria time). Override with PLUS_FREE_UNTIL=2026-11-08T23:59:59+01:00 */
export const FREE_UNTIL = new Date(process.env.PLUS_FREE_UNTIL || '2026-11-08T23:59:59+01:00');
export const plusFreeNow = () => process.env.PLUS_FREE_FOR_ALL !== 'false' && Date.now() < FREE_UNTIL.getTime();
export const planOf = (u: U): 'FREE' | 'PLUS' => (plusFreeNow() || (u.plan === 'PLUS' && (!u.planExpiresAt || u.planExpiresAt > new Date())) ? 'PLUS' : 'FREE');
export const LIMITS = { FREE: { likesPerDay: 10 }, PLUS: { likesPerDay: 50 } } as const;
// Free for everyone (never paywalled): block, report, private profile, pause Nearby, message requests, account deletion.
export const PLUS_FEATURES = ['hide_photo', 'see_likes', 'more_likes', 'voice_call', 'video_call'] as const;
export const hasFeature = (u: U, _f: (typeof PLUS_FEATURES)[number]) => planOf(u) === 'PLUS';

export const sortedPair = (a: string, b: string) => (a < b ? [a, b] : [b, a]);
export const areMatched = async (a: string, b: string) => {
  const [userAId, userBId] = sortedPair(a, b);
  return !!(await prisma.match.findUnique({ where: { userAId_userBId: { userAId, userBId } } }));
};
