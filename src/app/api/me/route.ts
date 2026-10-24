import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { clearSession, verify } from '@/lib/auth';
import { route, ok, fail } from '@/lib/http';
import { usernameSchema } from '@/lib/validators';
import { AREAS } from '@/lib/areas';
import { avatarUrl } from '@/lib/posts';
import { removeFile } from '@/lib/media';
import { planOf } from '@/lib/plan';

const S = z.object({
  displayName: z.string().trim().min(2).max(60), username: usernameSchema, bio: z.string().max(300),
  interests: z.array(z.string().trim().min(1).max(30)).max(10), area: z.enum(AREAS),
  visibility: z.enum(['PUBLIC', 'PRIVATE']), gender: z.enum(['Female', 'Male', 'Other', 'Prefer not to say']),
  datingIntent: z.boolean(), locationPaused: z.boolean(), onboarded: z.boolean(),
  intent: z.enum(['Friends', 'Dating', 'Marriage']), hidePhoto: z.boolean(),
}).partial();

export const GET = route(async (_r, _c, me) => {
  const { avatarPath, ...p } = me.profile!;
  return ok({ id: me.id, email: me.email, phone: me.phone, role: me.role, plan: planOf(me), profile: { ...p, avatarUrl: avatarUrl(avatarPath) } });
});

export const PATCH = route(async (req, _c, me) => {
  const data = S.parse(await req.json());
  if (data.hidePhoto && planOf(me) !== 'PLUS') return fail('Hiding your photo until a match is a Plus feature.', 403);
  try { await prisma.profile.update({ where: { userId: me.id }, data }); return ok({ ok: true }); }
  catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return fail('That username is taken.', 409);
    throw e;
  }
});

export const DELETE = route(async (req, _c, me) => {
  const { password } = z.object({ password: z.string().min(1, 'Enter your password to confirm') }).parse(await req.json());
  if (!(await verify(password, me.passwordHash))) return fail('Incorrect password.', 403);
  const files = await prisma.post.findMany({ where: { authorId: me.id }, select: { mediaPath: true } });
  const selfies = await prisma.verification.findMany({ where: { userId: me.id, selfiePath: { not: null } }, select: { selfiePath: true } });
  const msgFiles = await prisma.message.findMany({ where: { mediaPath: { not: null }, conversation: { OR: [{ userAId: me.id }, { userBId: me.id }] } }, select: { mediaPath: true } });
  await prisma.user.delete({ where: { id: me.id } });
  await Promise.all([...files, ...msgFiles].map((f) => removeFile(f.mediaPath)).concat(removeFile(me.profile?.avatarPath), selfies.map((s) => removeFile(s.selfiePath))));
  clearSession();
  return ok({ ok: true });
}, true, true);
