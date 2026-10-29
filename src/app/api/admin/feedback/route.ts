import { prisma } from '@/lib/db';
import { staff, ok } from '@/lib/http';

export const GET = staff(async (req) => {
  const all = new URL(req.url).searchParams.get('all') === '1';
  const rows = await prisma.feedback.findMany({
    where: all ? {} : { handled: false }, orderBy: { createdAt: 'desc' }, take: 100,
    include: { user: { select: { profile: { select: { username: true, displayName: true } } } } },
  });
  return ok(rows.map((r) => ({ id: r.id, category: r.category, message: r.message, rating: r.rating, handled: r.handled, createdAt: r.createdAt, username: r.user.profile?.username, displayName: r.user.profile?.displayName })));
});
