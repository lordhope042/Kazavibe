import { prisma } from '@/lib/db';
import { staff, ok } from '@/lib/http';
export const GET = staff(async () => ok(await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })), ['ADMIN']);
