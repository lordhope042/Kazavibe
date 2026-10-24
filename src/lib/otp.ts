import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { prisma } from './db';
import { sendMail } from './mail';
import { sendSms } from './sms';

type Purpose = 'VERIFY' | 'RESET' | 'PHONE_VERIFY' | 'PHONE_LOGIN';
const secret = () => {
  const s = process.env.OTP_SECRET;
  if (!s || s.length < 16 || s.includes('type-any-long')) throw new Error('Set OTP_SECRET in .env to a long random string (32+ characters)');
  return s;
};
const hmac = (target: string, purpose: Purpose, code: string) => createHmac('sha256', secret()).update(`${target}|${purpose}|${code}`).digest('hex');

const COPY = {
  VERIFY: { subject: 'Your KazaVibe verification code', intro: 'Welcome to KazaVibe! Use this code to verify your email address.' },
  RESET: { subject: 'Your KazaVibe password reset code', intro: 'Use this code to reset your KazaVibe password.' },
};

/** Cooldown check so a code cannot be requested over and over. `target` is an email or a phone number. */
export async function recentlySent(target: string, purpose: Purpose, seconds = 45) {
  const last = await prisma.otpCode.findFirst({ where: { email: target, purpose }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
  return !!last && Date.now() - last.createdAt.getTime() < seconds * 1000;
}

export async function issueOtp(target: string, purpose: Purpose) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await prisma.otpCode.updateMany({ where: { email: target, purpose, usedAt: null }, data: { usedAt: new Date() } }); // older codes stop working
  await prisma.otpCode.create({ data: { email: target, purpose, codeHash: hmac(target, purpose, code), expiresAt: new Date(Date.now() + 10 * 60_000) } });
  if (purpose === 'PHONE_VERIFY' || purpose === 'PHONE_LOGIN') { await sendSms(target, `KazaVibe code: ${code}. Valid for 10 minutes. Never share it with anyone.`); return; }
  const { subject, intro } = COPY[purpose];
  const text = `${intro}\n\nYour code: ${code}\n\nIt expires in 10 minutes. If you did not request it, ignore this email. Never share this code with anyone.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #eee;border-radius:16px"><h2 style="margin:0 0 8px;color:#E8540F">KazaVibe</h2><p style="color:#333">${intro}</p><p style="font-size:34px;letter-spacing:8px;font-weight:700;margin:20px 0;color:#111">${code}</p><p style="color:#666;font-size:13px">This code expires in 10 minutes. If you did not request it, you can ignore this email. Never share this code with anyone.</p></div>`;
  await sendMail(target, subject, text, html);
}

/** True only for the latest unused, unexpired code. Five wrong tries kills the code. */
export async function checkOtp(target: string, purpose: Purpose, code: string) {
  const o = await prisma.otpCode.findFirst({ where: { email: target, purpose, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!o || o.attempts >= 5) return false;
  const a = Buffer.from(o.codeHash), b = Buffer.from(hmac(target, purpose, code));
  if (a.length !== b.length || !timingSafeEqual(a, b)) { await prisma.otpCode.update({ where: { id: o.id }, data: { attempts: { increment: 1 } } }); return false; }
  await prisma.otpCode.update({ where: { id: o.id }, data: { usedAt: new Date() } });
  return true;
}
