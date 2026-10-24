import { prisma } from '@/lib/db';
import { route, ok } from '@/lib/http';
import { avatarUrl } from '@/lib/posts';

export const GET = route(async (_r, _c, me) => {
  const mine = me.profile!;
  if (!mine.datingIntent) return ok({ enabled: false, items: [] });
  const acted = (await prisma.interest.findMany({ where: { fromId: me.id }, select: { toId: true } })).map((x) => x.toId);
  const rows = await prisma.profile.findMany({
    where: { datingIntent: true, userId: { not: me.id, notIn: acted }, user: { status: 'ACTIVE', blockedBy: { none: { blockerId: me.id } }, blocking: { none: { blockedId: me.id } } } },
    select: { username: true, displayName: true, area: true, bio: true, visibility: true, interests: true, intent: true, verified: true, avatarPath: true },
    orderBy: { createdAt: 'desc' }, take: 60,
  });
  const items = rows.map((r) => {
    const common = r.interests.filter((i) => mine.interests.includes(i));
    return { username: r.username, displayName: r.displayName, area: r.area, intent: r.intent, verified: r.verified, interests: r.interests, common, bio: r.visibility === 'PUBLIC' ? r.bio : '', avatarUrl: avatarUrl(r.avatarPath), score: common.length * 2 + (r.area === mine.area ? 1 : 0) };
  }).sort((a, b) => b.score - a.score).slice(0, 20);
  return ok({ enabled: true, items });
});
