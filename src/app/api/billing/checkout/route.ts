import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { initializeTransaction, planById } from '@/lib/billing';

export const POST = route(async (req, _c, me) => {
  const { planId } = z.object({ planId: z.string() }).parse(await req.json());
  const plan = planById(planId);
  if (!plan) return fail('Unknown plan.');
  if (!me.email) return fail('Add an email address to your account before paying.');
  if (!hit('checkout:' + me.id, 10, 3_600_000)) return fail('Too many attempts. Try again later.', 429);
  const reference = 'kv_' + randomUUID().replaceAll('-', ''), amountKobo = plan.priceNgn * 100;
  await prisma.payment.create({ data: { userId: me.id, reference, planId: plan.id, months: plan.months, amountKobo } });
  try {
    const base = process.env.APP_URL || new URL(req.url).origin;
    const d = await initializeTransaction({ email: me.email, amount: amountKobo, currency: 'NGN', reference, callback_url: `${base}/billing/callback`, metadata: { userId: me.id, planId: plan.id } });
    return ok({ url: d.authorization_url });
  } catch (e) {
    await prisma.payment.updateMany({ where: { reference }, data: { status: 'FAILED' } });
    throw e;
  }
});
