import { prisma } from '@/lib/db';
import { route, ok } from '@/lib/http';
import { avatarUrl } from '@/lib/posts';

const prof = { select: { id: true, profile: { select: { username: true, displayName: true, area: true, avatarPath: true } } } } as const;
export const GET = route(async (_r, _c, me) => {
  const rows = await prisma.match.findMany({ where: { OR: [{ userAId: me.id }, { userBId: me.id }] }, orderBy: { createdAt: 'desc' }, take: 50, select: { createdAt: true, userA: prof, userB: prof } });
  return ok(rows.map((m) => { const o = m.userA.id === me.id ? m.userB : m.userA; return { username: o.profile!.username, displayName: o.profile!.displayName, area: o.profile!.area, avatarUrl: avatarUrl(o.profile!.avatarPath), createdAt: m.createdAt }; }));
});
