import { z } from 'zod';
import { prisma } from '@/lib/db';
import { staff, ok, fail } from '@/lib/http';
import { fulfill, grantPlus } from '@/lib/billing';

const S = z.object({ action: z.enum(['recheck', 'approve', 'reject']), note: z.string().max(500).optional() });

export const POST = staff(async (req, { params }, me) => {
  const { action, note } = S.parse(await req.json());
  const pay = await prisma.payment.findUnique({ where: { id: params.id } });
  if (!pay) return fail('Payment not found', 404);
  const audit = (db: Pick<typeof prisma, 'auditLog'>) => db.auditLog.create({ data: { actorId: me.id, action: `payment.${action}`, targetId: pay.id, meta: { reference: pay.reference, note: note ?? null } } });
  if (action === 'recheck') { // asks Paystack again, exactly like the customer's return page does
    const result = await fulfill(pay.reference);
    await audit(prisma);
    return ok({ result });
  }
  if (pay.status !== 'REVIEW') return fail('Only payments under review can be approved or rejected.');
  await prisma.$transaction(async (db) => {
    const moved = await db.payment.updateMany({ where: { id: pay.id, status: 'REVIEW' }, data: action === 'approve' ? { status: 'SUCCESS', paidAt: new Date() } : { status: 'FAILED' } });
    if (moved.count === 1 && action === 'approve') await grantPlus(db, pay.userId, pay.months);
    await audit(db);
  });
  return ok({ ok: true });
}, ['ADMIN']);
