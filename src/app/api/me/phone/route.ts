import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { issueOtp, recentlySent } from '@/lib/otp';
import { parseContact } from '@/lib/validators';

// Step 1 of adding a phone number: send a code to it.
export const POST = route(async (req, _c, me) => {
  const { phone } = z.object({ phone: z.string().min(7).max(20) }).parse(await req.json());
  const c = parseContact(phone);
  if (!c || !('phone' in c)) return fail('Enter a valid phone number, for example 0803 123 4567.');
  if (!hit('phone:' + me.id, 5, 3_600_000)) return fail('Too many attempts. Try again later.', 429);
  const taken = await prisma.user.findFirst({ where: { phone: c.phone, NOT: { id: me.id } }, select: { id: true } });
  if (taken) return fail('That number cannot be used on this account.');
  if (await recentlySent(c.phone, 'PHONE_VERIFY')) return fail('Please wait a moment before asking for another code.', 429);
  try { await issueOtp(c.phone, 'PHONE_VERIFY'); } catch (e) { console.error('SMS failed:', e); return fail('We could not send the SMS right now. Try again shortly.', 502); }
  return ok({ phone: c.phone });
});
export const DELETE = route(async (_r, _c, me) => { await prisma.user.update({ where: { id: me.id }, data: { phone: null, phoneVerifiedAt: null } }); return ok({ ok: true }); });
