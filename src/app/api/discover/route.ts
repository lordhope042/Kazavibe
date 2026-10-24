import { prisma } from '@/lib/db';
import { route, ok } from '@/lib/http';
import { AREAS } from '@/lib/areas';
import { avatarUrl } from '@/lib/posts';

// Also powers /nearby: area-based only (no GPS, no coordinates are ever stored). Members who paused discovery are excluded there.
export const GET = route(async (req, _c, me) => {
  const u = new URL(req.url), nearby = u.searchParams.get('nearby') === '1';
  const q = (u.searchParams.get('q') ?? '').trim().slice(0, 50), area = u.searchParams.get('area') ?? '';
  const limit = Math.min(Number(u.searchParams.get('limit')) || 40, 60);
  const rows = await prisma.profile.findMany({
    where: {
      userId: { not: me.id }, ...(nearby ? { locationPaused: false } : {}),
      user: { status: 'ACTIVE', blockedBy: { none: { blockerId: me.id } }, blocking: { none: { blockedId: me.id } } },
      ...((AREAS as readonly string[]).includes(area) ? { area } : {}),
      ...(q ? { OR: [{ username: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }] } : {}),
    },
    select: { userId: true, username: true, displayName: true, area: true, verified: true, visibility: true, bio: true, avatarPath: true },
    orderBy: { createdAt: 'desc' }, take: limit,
  });
  const ids = rows.map((r) => r.userId);
  const [f, r] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: me.id, followingId: { in: ids } }, select: { followingId: true } }),
    prisma.followRequest.findMany({ where: { fromId: me.id, toId: { in: ids } }, select: { toId: true } }),
  ]);
  const fs = new Set(f.map((x) => x.followingId)), rs = new Set(r.map((x) => x.toId));
  const out = rows.map(({ userId, bio, avatarPath, ...p }) => ({
    ...p, avatarUrl: avatarUrl(avatarPath), sameArea: p.area === me.profile!.area,
    bio: p.visibility === 'PUBLIC' || fs.has(userId) ? bio : '',
    state: fs.has(userId) ? 'following' : rs.has(userId) ? 'requested' : 'none',
  }));
  if (nearby) out.sort((a, b) => Number(b.sameArea) - Number(a.sameArea));
  return ok(out);
});
