import { z } from 'zod';
import { prisma } from '@/lib/db';
import { staff, ok, fail } from '@/lib/http';
import { removeFile } from '@/lib/media';
import { notify } from '@/lib/notify';

const S = z.object({ action: z.enum(['approve', 'reject']), reason: z.string().max(300).optional() });
export const POST = staff(async (req, { params }, me) => {
  const { action, reason } = S.parse(await req.json());
  const v = await prisma.verification.findUnique({ where: { id: params.id } });
  if (!v || v.status !== 'PENDING') return fail('Nothing to review here.', 404);
  await prisma.$transaction([
    prisma.verification.update({ where: { id: v.id }, data: { status: action === 'approve' ? 'APPROVED' : 'REJECTED', reason: action === 'reject' ? reason ?? 'We could not confirm your selfie.' : null, selfiePath: null, decidedAt: new Date(), decidedBy: me.id } }),
    ...(action === 'approve' ? [prisma.profile.update({ where: { userId: v.userId }, data: { verified: true } })] : []),
    prisma.auditLog.create({ data: { actorId: me.id, action: `verification.${action}`, targetId: v.id, meta: { reason: reason ?? null } } }),
  ]);
  await removeFile(v.selfiePath); // the selfie is erased the moment a decision is made
  void notify(v.userId, me.id, action === 'approve' ? 'verified' : 'verification_rejected').catch(() => {});
  return ok({ ok: true });
}, ['ADMIN']);
