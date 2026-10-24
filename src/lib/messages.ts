import type { Prisma } from '@prisma/client';
import { prisma } from './db';

type M = { id: string; senderId: string; body: string; kind: string; mediaPath: string | null; fileName: string | null; durationSec: number | null; createdAt: Date; readAt: Date | null; deliveredAt: Date | null; deletedAt: Date | null; pinned: boolean };
export const statusOf = (m: { readAt: Date | null; deliveredAt: Date | null }) => (m.readAt ? 'read' : m.deliveredAt ? 'delivered' : 'sent');
export const shapeMsg = (m: M, me: string) => {
  const gone = !!m.deletedAt;
  return {
    id: m.id, mine: m.senderId === me, kind: gone ? 'DELETED' : m.kind, body: gone ? '' : m.body, url: gone || !m.mediaPath ? null : `/api/media/${m.mediaPath}`,
    fileName: gone ? null : m.fileName, durationSec: gone ? null : m.durationSec, createdAt: m.createdAt, status: statusOf(m), pinned: m.pinned && !gone,
  };
};
export const preview = (kind: string, body: string) => (kind === 'DELETED' ? 'This message was deleted' : kind === 'TEXT' ? body : kind === 'IMAGE' ? 'Photo' : kind === 'VIDEO' ? 'Video' : kind === 'VOICE' ? 'Voice note' : 'File');

/** Messages the member has not removed with "Delete for me". */
export const visibleMsg = (me: string): Prisma.MessageWhereInput => ({ OR: [{ conversation: { userAId: me }, hiddenA: false }, { conversation: { userBId: me }, hiddenB: false }] });

/** Incoming messages count as delivered as soon as the recipient's app is open (list, heartbeat or chat). */
export const markDelivered = (me: string) =>
  prisma.message.updateMany({ where: { senderId: { not: me }, deliveredAt: null, conversation: { OR: [{ userAId: me }, { userBId: me }] } }, data: { deliveredAt: new Date() } });
