import { prisma } from './db';

type U = { plan: 'FREE' | 'PLUS'; planExpiresAt: Date | null };
/** Single source of truth for paid features. Always check on the server, never trust the client. */
export const planOf = (u: U): 'FREE' | 'PLUS' => (u.plan === 'PLUS' && (!u.planExpiresAt || u.planExpiresAt > new Date()) ? 'PLUS' : 'FREE');
export const LIMITS = { FREE: { likesPerDay: 10 }, PLUS: { likesPerDay: 50 } } as const;
// Free for everyone (never paywalled): block, report, private profile, pause Nearby, message requests, account deletion.
export const PLUS_FEATURES = ['hide_photo', 'see_likes', 'more_likes', 'voice_call', 'video_call'] as const;
export const hasFeature = (u: U, _f: (typeof PLUS_FEATURES)[number]) => planOf(u) === 'PLUS';

export const sortedPair = (a: string, b: string) => (a < b ? [a, b] : [b, a]);
export const areMatched = async (a: string, b: string) => {
  const [userAId, userBId] = sortedPair(a, b);
  return !!(await prisma.match.findUnique({ where: { userAId_userBId: { userAId, userBId } } }));
};
