import { prisma } from '@/lib/db';
import { staff, ok } from '@/lib/http';
import { maskEmail } from '@/lib/validators';

// Administrators only. Emails are partly hidden: enough to recognise the member, not to copy.
export const GET = staff(async (req) => {
  const status = new URL(req.url).searchParams.get('status') ?? '';
  const rows = await prisma.payment.findMany({
    where: ['PENDING', 'SUCCESS', 'FAILED', 'REVIEW'].includes(status) ? { status } : {}, orderBy: { createdAt: 'desc' }, take: 50,
    select: { id: true, reference: true, months: true, amountKobo: true, status: true, createdAt: true, paidAt: true, user: { select: { email: true, profile: { select: { username: true } } } } },
  });
  return ok(rows.map((r) => ({ id: r.id, reference: r.reference, months: r.months, amountNgn: r.amountKobo / 100, status: r.status, createdAt: r.createdAt, paidAt: r.paidAt, username: r.user.profile?.username ?? 'unknown', email: r.user.email ? maskEmail(r.user.email) : null })));
}, ['ADMIN']);
