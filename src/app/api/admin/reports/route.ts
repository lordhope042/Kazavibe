import { prisma } from '@/lib/db';
import { staff, ok } from '@/lib/http';
export const GET = staff(async () => {
  const rows = await prisma.report.findMany({ where: { status: { in: ['OPEN', 'REVIEWING'] } }, orderBy: { createdAt: 'asc' }, take: 50, include: { reporter: { select: { profile: { select: { username: true } } } } } });
  return ok(await Promise.all(rows.map(async (r) => {
    let target: Record<string, unknown> = {};
    if (r.targetType === 'POST') {
      const p = await prisma.post.findUnique({ where: { id: r.targetId }, select: { caption: true, kind: true, mediaPath: true, status: true, author: { select: { profile: { select: { username: true } } } } } });
      target = { kind: p?.kind, caption: p?.caption, mediaUrl: p ? `/api/media/${p.mediaPath}` : null, removed: p?.status === 'REMOVED', username: p?.author.profile?.username };
    } else {
      const p = await prisma.profile.findUnique({ where: { userId: r.targetId }, select: { username: true, displayName: true } });
      target = { username: p?.username, displayName: p?.displayName };
    }
    return { id: r.id, targetType: r.targetType, category: r.category, details: r.details, createdAt: r.createdAt, reporter: r.reporter.profile?.username, target };
  })));
});
