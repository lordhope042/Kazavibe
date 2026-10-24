import { z } from 'zod';
import { prisma } from '@/lib/db';
import { staff, ok, fail } from '@/lib/http';

const S = z.object({ action: z.enum(['dismiss', 'resolve', 'remove_content', 'suspend_user']), note: z.string().max(500).optional() });

export const POST = staff(async (req, { params }, me) => {
  const { action, note } = S.parse(await req.json());
  const r = await prisma.report.findUnique({ where: { id: params.id } });
  if (!r) return fail('Report not found', 404);
  if (action === 'suspend_user' && me.role !== 'ADMIN') return fail('Only administrators can suspend accounts.', 403);
  const post = r.targetType === 'POST' ? await prisma.post.findUnique({ where: { id: r.targetId } }) : null;
  const ops: any[] = [prisma.report.update({ where: { id: r.id }, data: { status: action === 'dismiss' ? 'DISMISSED' : 'RESOLVED' } })];
  if (action === 'remove_content' && post) ops.push(prisma.post.update({ where: { id: post.id }, data: { status: 'REMOVED' } }));
  if (action === 'suspend_user') {
    const uid = post ? post.authorId : r.targetId;
    const t = await prisma.user.findUnique({ where: { id: uid } });
    if (!t || t.role !== 'MEMBER') return fail('That account cannot be suspended here.', 403);
    ops.push(prisma.user.update({ where: { id: uid }, data: { status: 'SUSPENDED' } }));
  }
  ops.push(prisma.auditLog.create({ data: { actorId: me.id, action: `report.${action}`, targetId: r.id, meta: { note: note ?? null, targetType: r.targetType, targetId: r.targetId } } }));
  await prisma.$transaction(ops);
  return ok({ ok: true });
});
