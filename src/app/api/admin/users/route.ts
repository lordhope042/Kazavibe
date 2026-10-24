import { prisma } from '@/lib/db';
import { staff, ok } from '@/lib/http';
export const GET = staff(async (req) => {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 50);
  const rows = await prisma.profile.findMany({
    where: q ? { OR: [{ username: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }] } : {},
    orderBy: { createdAt: 'desc' }, take: 30, select: { userId: true, username: true, displayName: true, area: true, user: { select: { status: true, role: true, createdAt: true, plan: true } } },
  });
  return ok(rows.map((r) => ({ id: r.userId, username: r.username, displayName: r.displayName, area: r.area, status: r.user.status, plan: r.user.plan, role: r.user.role, createdAt: r.user.createdAt })));
});
