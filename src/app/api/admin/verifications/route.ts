import { prisma } from '@/lib/db';
import { staff, ok } from '@/lib/http';
import { removeFile } from '@/lib/media';

// Administrators only. Moderators never see identity material.
export const GET = staff(async () => {
  const stale = await prisma.verification.findMany({ where: { status: 'PENDING', createdAt: { lt: new Date(Date.now() - 14 * 864e5) } } }); // retention: unreviewed selfies expire after 14 days
  for (const s of stale) { await removeFile(s.selfiePath); await prisma.verification.update({ where: { id: s.id }, data: { status: 'REJECTED', reason: 'Expired before review. Please try again.', selfiePath: null, decidedAt: new Date() } }); }
  const rows = await prisma.verification.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 30, select: { id: true, code: true, selfiePath: true, createdAt: true, user: { select: { profile: { select: { username: true, displayName: true } } } } } });
  return ok(rows.map((r) => ({ id: r.id, code: r.code, createdAt: r.createdAt, username: r.user.profile?.username, displayName: r.user.profile?.displayName, selfieUrl: r.selfiePath ? `/api/media/${r.selfiePath}` : null })));
}, ['ADMIN']);
