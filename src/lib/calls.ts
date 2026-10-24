import { prisma } from './db';
/** Rings stop after 45 s (missed). A call left "active" for 3 h (browser closed) is closed. */
export async function cleanupCalls() {
  const now = Date.now();
  await prisma.call.updateMany({ where: { status: 'RINGING', createdAt: { lt: new Date(now - 45_000) } }, data: { status: 'MISSED', endedAt: new Date() } });
  await prisma.call.updateMany({ where: { status: 'ACTIVE', answeredAt: { lt: new Date(now - 3 * 3600_000) } }, data: { status: 'ENDED', endedAt: new Date() } });
}
