import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';

export const POST = route(async (req, { params }, me) => {
  const b = z.object({ type: z.enum(['offer', 'answer', 'ice']), payload: z.any() }).parse(await req.json());
  if (!hit('sig:' + me.id, 600, 60_000)) return fail('Too many signals.', 429);
  const c = await prisma.call.findUnique({ where: { id: params.id } });
  if (!c || (c.callerId !== me.id && c.calleeId !== me.id)) return fail('Call not found', 404);
  if (!['RINGING', 'ACTIVE'].includes(c.status)) return fail('This call has ended.', 409);
  if ((b.type === 'offer' && c.callerId !== me.id) || (b.type === 'answer' && c.calleeId !== me.id)) return fail('Not allowed', 403);
  const payload = JSON.stringify(b.payload ?? null);
  if (payload.length > 20_000) return fail('Signal too large.');
  const s = await prisma.callSignal.create({ data: { callId: c.id, fromId: me.id, type: b.type, payload } });
  return ok({ id: s.id });
});
