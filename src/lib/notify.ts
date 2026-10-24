import { prisma } from './db';
import { pushTo } from './push';

const TEXT: Record<string, string> = { like: 'liked your post', comment: 'commented on your post', reply: 'replied to your comment', follow: 'started following you', follow_request: 'requested to follow you', request_approved: 'approved your follow request', match: "matched with you. Say hello!" };
export async function notify(userId: string, actorId: string, type: string, postId?: string) {
  if (userId === actorId) return;
  await prisma.notification.create({ data: { userId, actorId, type, postId } });
  const a = await prisma.profile.findUnique({ where: { userId: actorId }, select: { displayName: true } });
  void pushTo(userId, { title: 'KazaVibe', body: `${a?.displayName ?? 'Someone'} ${TEXT[type] ?? 'interacted with you'}`, url: type === 'follow_request' ? '/settings' : type === 'match' ? '/messages' : '/notifications', tag: type });
}
