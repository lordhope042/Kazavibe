// Usage: npm run make-admin -- you@example.com   (or a phone number)
import { PrismaClient } from '@prisma/client';
const [, , c, role = 'ADMIN'] = process.argv;
if (!c) { console.error('Usage: npm run make-admin -- <email|phone> [ADMIN|MODERATOR]'); process.exit(1); }
let p = c.trim().replace(/[\s-]/g, '');
const where = c.includes('@') ? { email: c.trim().toLowerCase() } : { phone: /^0\d{10}$/.test(p) ? '+234' + p.slice(1) : p.startsWith('+') ? p : '+' + p };
const db = new PrismaClient();
const u = await db.user.findUnique({ where });
if (!u) { console.error('No member found with that contact.'); process.exit(1); }
await db.user.update({ where: { id: u.id }, data: { role } });
console.log(`${c} is now ${role}`);
await db.$disconnect();
