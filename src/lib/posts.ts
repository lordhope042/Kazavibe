import type { Prisma } from '@prisma/client';
import { prisma } from './db';

export const avatarUrl = (n?: string | null) => (n ? `/api/media/${n}` : null);

/** Server-side visibility: active author, no blocks, and public-profile/follower rules. */
export const visibleTo = (me: string): Prisma.PostWhereInput => ({
  status: 'VISIBLE',
  author: { status: 'ACTIVE', blockedBy: { none: { blockerId: me } }, blocking: { none: { blockedId: me } } },
  OR: [{ authorId: me }, { author: { followers: { some: { followerId: me } } } }, { audience: 'PUBLIC', author: { profile: { visibility: 'PUBLIC' } } }],
});
export const getVisiblePost = (me: string, id: string) => prisma.post.findFirst({ where: { id, ...visibleTo(me) }, select: { id: true, authorId: true } });

export const postSelect = (me: string) => ({
  id: true, kind: true, mediaPath: true, caption: true, audience: true, createdAt: true,
  author: { select: { id: true, profile: { select: { username: true, displayName: true, avatarPath: true, verified: true } }, followers: { where: { followerId: me }, select: { followerId: true } } } },
  _count: { select: { likes: true, comments: { where: { status: 'VISIBLE' as const } } } },
  likes: { where: { userId: me }, select: { userId: true } },
  saves: { where: { userId: me }, select: { userId: true } },
}) satisfies Prisma.PostSelect;

type Row = Prisma.PostGetPayload<{ select: ReturnType<typeof postSelect> }>;
export const shape = (p: Row, me: string) => ({
  id: p.id, kind: p.kind, mediaUrl: `/api/media/${p.mediaPath}`, caption: p.caption, audience: p.audience, createdAt: p.createdAt,
  mine: p.author.id === me,
  author: { username: p.author.profile!.username, displayName: p.author.profile!.displayName, avatarUrl: avatarUrl(p.author.profile!.avatarPath), verified: p.author.profile!.verified },
  following: p.author.followers.length > 0,
  likes: p._count.likes, comments: p._count.comments, liked: p.likes.length > 0, saved: p.saves.length > 0,
});
