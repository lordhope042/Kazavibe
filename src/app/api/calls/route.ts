import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { visibleProfile } from '@/lib/privacy';
import { planOf, sortedPair } from '@/lib/plan';
import { cleanupCalls } from '@/lib/calls';
import { pushTo } from '@/lib/push';

// Starting a call is a Plus feature. Answering is free.
export const POST = route(async (req, _c, me) => {
  const b = z.object({ username: z.string().min(1), kind: z.enum(['AUDIO', 'VIDEO']) }).parse(await req.json());
  if (planOf(me) !== 'PLUS') return fail('Voice and video calls are a Plus feature.', 403);
  if (!hit('call:' + me.id, 20, 3_600_000)) return fail('Too many calls. Try again later.', 429);
  const t = await visibleProfile(me.id, b.username);
  if (!t || t.userId === me.id) return fail('Member not found', 404);
  const [userAId, userBId] = sortedPair(me.id, t.userId);
  const conv = await prisma.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
  if (!conv?.accepted) return fail('You can call someone once your chat is accepted.', 403);
  await cleanupCalls();
  const busy = await prisma.call.findFirst({ where: { status: { in: ['RINGING', 'ACTIVE'] }, OR: [{ callerId: me.id }, { calleeId: me.id }, { callerId: t.userId }, { calleeId: t.userId }] }, select: { callerId: true, calleeId: true } });
  if (busy) return fail(busy.callerId === me.id || busy.calleeId === me.id ? 'You are already in a call.' : 'They are on another call right now.', 409);
  const call = await prisma.call.create({ data: { callerId: me.id, calleeId: t.userId, kind: b.kind } });
  void pushTo(t.userId, { title: me.profile!.displayName, body: b.kind === 'VIDEO' ? 'Incoming video call' : 'Incoming voice call', url: '/messages', tag: 'call' });
  return ok({ id: call.id }, 201);
});
