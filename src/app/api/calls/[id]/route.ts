import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { cleanupCalls } from '@/lib/calls';

const load = async (id: string, me: string) => {
  await cleanupCalls();
  const c = await prisma.call.findUnique({ where: { id } });
  return c && (c.callerId === me || c.calleeId === me) ? c : null;
};
// Polled while a call is being set up: returns the call status plus the other person's new signalling messages.
export const GET = route(async (req, { params }, me) => {
  const c = await load(params.id, me.id);
  if (!c) return fail('Call not found', 404);
  const after = Number(new URL(req.url).searchParams.get('after')) || 0;
  const sigs = await prisma.callSignal.findMany({ where: { callId: c.id, id: { gt: after }, fromId: { not: me.id } }, orderBy: { id: 'asc' }, take: 100 });
  return ok({ status: c.status, signals: sigs.map((s) => ({ id: s.id, type: s.type, payload: JSON.parse(s.payload) })) });
});
export const POST = route(async (req, { params }, me) => {
  const { action } = z.object({ action: z.enum(['accept', 'decline', 'end']) }).parse(await req.json());
  const c = await load(params.id, me.id);
  if (!c) return fail('Call not found', 404);
  const now = new Date();
  if (action === 'accept' || action === 'decline') {
    if (c.calleeId !== me.id) return fail('Not allowed', 403);
    const r = await prisma.call.updateMany({ where: { id: c.id, status: 'RINGING' }, data: action === 'accept' ? { status: 'ACTIVE', answeredAt: now } : { status: 'DECLINED', endedAt: now } });
    if (r.count !== 1) return fail('This call is no longer available.', 409);
  } else await prisma.call.updateMany({ where: { id: c.id, status: { in: ['RINGING', 'ACTIVE'] } }, data: { status: 'ENDED', endedAt: now } });
  return ok({ ok: true });
});
