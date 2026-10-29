import { route, ok, fail } from '@/lib/http';
import { hitDb } from '@/lib/ratelimit';
import { issueOtp, recentlySent } from '@/lib/otp';

export const POST = route(async (_r, _c, me) => {
  if (!me.email || me.emailVerifiedAt) return ok({ ok: true });
  if (!(await hitDb('resend:' + me.id, 5, 3_600_000))) return fail('Too many codes requested. Try again later.', 429);
  if (await recentlySent(me.email, 'VERIFY')) return fail('Please wait a moment before asking for another code.', 429);
  try { await issueOtp(me.email, 'VERIFY'); } catch (e) { console.error('Could not send verification email:', e); return fail('We could not send the email right now. Try again shortly.', 502); }
  return ok({ ok: true });
}, true, true);
