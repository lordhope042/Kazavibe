import { z } from 'zod';
export const ageOf = (d: Date, now = new Date()) => {
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
};
export function parseContact(c: string): { email: string } | { phone: string } | null {
  const v = c.trim();
  if (v.includes('@')) return z.string().email().safeParse(v.toLowerCase()).success ? { email: v.toLowerCase() } : null;
  let p = v.replace(/[\s-]/g, '');
  if (/^0\d{10}$/.test(p)) p = '+234' + p.slice(1); // Nigerian local format -> E.164
  return /^\+?\d{10,15}$/.test(p) ? { phone: p.startsWith('+') ? p : '+' + p } : null;
}
export const usernameSchema = z.string().regex(/^[a-z0-9_]{3,20}$/, 'Username: 3-20 lowercase letters, numbers or _');
export const maskEmail = (e: string) => { const [n, d] = e.split('@'); return `${n.slice(0, 1)}${'*'.repeat(Math.max(2, n.length - 1))}@${d}`; };
