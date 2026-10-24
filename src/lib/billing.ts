import { createHmac, timingSafeEqual } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { HttpError } from './http';

// Prices are decided here on the server. The browser only ever sends a plan id.
const base = Number(process.env.PLUS_PRICE_NGN ?? 1000);
const round50 = (n: number) => Math.round(n / 50) * 50;
export const PLANS = [
  { id: 'plus-1', months: 1, label: '1 month', priceNgn: base },
  { id: 'plus-3', months: 3, label: '3 months', priceNgn: round50(base * 3 * 0.9) },
  { id: 'plus-12', months: 12, label: '12 months', priceNgn: round50(base * 12 * 0.75) },
];
export const planById = (id: string) => PLANS.find((p) => p.id === id);

async function paystack(path: string, init?: RequestInit) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new HttpError('Payments are not set up yet. Please try again later.', 503);
  const r = await fetch('https://api.paystack.co' + path, { ...init, cache: 'no-store', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.status) throw new HttpError(j.message ?? 'The payment provider returned an error.', 502);
  return j.data;
}
export const initializeTransaction = (body: object) => paystack('/transaction/initialize', { method: 'POST', body: JSON.stringify(body) });
export const verifyTransaction = (reference: string) => paystack(`/transaction/verify/${encodeURIComponent(reference)}`);

/** Webhook authenticity: Paystack signs the raw body with HMAC-SHA512 using your secret key. */
export function verifySignature(raw: string, signature: string) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !signature) return false;
  const a = Buffer.from(createHmac('sha512', key).update(raw).digest('hex')), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Confirms a payment with Paystack (never trusts the browser or the webhook body alone) and grants Plus.
 * Safe to call many times for the same reference: Plus is granted exactly once.
 */
export async function fulfill(reference: string): Promise<'success' | 'failed' | 'pending' | 'unknown'> {
  const pay = await prisma.payment.findUnique({ where: { reference } });
  if (!pay) return 'unknown';
  if (pay.status === 'SUCCESS') return 'success';
  const tx = await verifyTransaction(reference);
  if (tx.status !== 'success') {
    if (['failed', 'abandoned', 'reversed'].includes(tx.status)) { await prisma.payment.updateMany({ where: { id: pay.id, status: 'PENDING' }, data: { status: 'FAILED' } }); return 'failed'; }
    return 'pending';
  }
  if (tx.amount !== pay.amountKobo || tx.currency !== 'NGN') { // paid, but not what we asked for: hold for a human to look at, grant nothing
    console.error('Payment mismatch', { reference, expected: pay.amountKobo, got: tx.amount, currency: tx.currency });
    await prisma.payment.updateMany({ where: { id: pay.id, status: 'PENDING' }, data: { status: 'REVIEW' } });
    return 'failed';
  }
  await prisma.$transaction(async (db) => {
    const claimed = await db.payment.updateMany({ where: { id: pay.id, status: 'PENDING' }, data: { status: 'SUCCESS', paidAt: new Date() } });
    if (claimed.count !== 1) return; // someone else already granted it
    await grantPlus(db, pay.userId, pay.months);
  });
  return 'success';
}

/** Adds Plus time. Renewing early adds to the time that is left. Used by checkout and by admin approvals. */
export async function grantPlus(db: Prisma.TransactionClient, userId: string, months: number) {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { planExpiresAt: true } });
  const from = u.planExpiresAt && u.planExpiresAt > new Date() ? u.planExpiresAt : new Date();
  await db.user.update({ where: { id: userId }, data: { plan: 'PLUS', planExpiresAt: new Date(from.getTime() + months * 30 * 864e5) } });
}
