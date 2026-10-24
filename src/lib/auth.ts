import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './db';

const COOKIE = 'kv_session';
const key = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET must be set (16+ chars)');
  return new TextEncoder().encode(s);
};
export const hash = (p: string) => bcrypt.hash(p, 12);
export const verify = (p: string, h: string) => bcrypt.compare(p, h);

export async function createSession(userId: string) {
  const token = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuedAt().setExpirationTime('30d').sign(key());
  cookies().set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
}
export const clearSession = () => cookies().delete(COOKIE);

export async function currentUser() {
  const t = cookies().get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    const u = await prisma.user.findUnique({ where: { id: payload.sub! }, include: { profile: true } });
    if (u?.passwordChangedAt && (payload.iat ?? 0) < Math.floor(u.passwordChangedAt.getTime() / 1000)) return null; // password was changed after this session started
    return u && u.status !== 'SUSPENDED' ? u : null;
  } catch { return null; }
}
export type Me = NonNullable<Awaited<ReturnType<typeof currentUser>>>;
