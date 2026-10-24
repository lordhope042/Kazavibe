import { prisma } from './db';
export const blockedBetween = async (a: string, b: string) =>
  (await prisma.block.count({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] } })) > 0;

/** Active, non-blocked profile or null. Server-side gate for every interaction with another member. */
export async function visibleProfile(viewerId: string, username: string) {
  const p = await prisma.profile.findUnique({ where: { username }, include: { user: { select: { status: true } } } });
  if (!p || p.user.status !== 'ACTIVE' || (await blockedBetween(viewerId, p.userId))) return null;
  return p;
}
