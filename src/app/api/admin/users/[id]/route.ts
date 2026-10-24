import { z } from 'zod';
import { prisma } from '@/lib/db';
import { staff, ok, fail } from '@/lib/http';

const S = z.object({ action: z.enum(['suspend', 'restore', 'grant_plus', 'revoke_plus']), reason: z.string().max(500).optional() });
export const POST = staff(async (req, { params }, me) => {
  const { action, reason } = S.parse(await req.json());
  const t = await prisma.user.findUnique({ where: { id: params.id } });
  if (!t || t.role !== 'MEMBER') return fail('That account cannot be changed here.', 403);
  const data =
    action === 'suspend' ? { status: 'SUSPENDED' as const } :
    action === 'restore' ? { status: 'ACTIVE' as const } :
    action === 'grant_plus' ? { plan: 'PLUS' as const, planExpiresAt: new Date(Date.now() + 30 * 864e5) } :
    { plan: 'FREE' as const, planExpiresAt: null };
  await prisma.$transaction([
    prisma.user.update({ where: { id: t.id }, data }),
    prisma.auditLog.create({ data: { actorId: me.id, action: `user.${action}`, targetId: t.id, meta: { reason: reason ?? null } } }),
  ]);
  return ok({ ok: true });
}, ['ADMIN']);
