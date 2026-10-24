import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { saveUpload } from '@/lib/media';
import { postSelect, shape, visibleTo } from '@/lib/posts';

export const GET = route(async (req, _c, me) => {
  const u = new URL(req.url), f = u.searchParams.get('feed') ?? 'home', cur = u.searchParams.get('cursor');
  const fol = { author: { followers: { some: { followerId: me.id } } } };
  const extra: Prisma.PostWhereInput =
    f === 'home' ? { OR: [{ authorId: me.id }, fol] } :
    f === 'clips' ? { kind: 'CLIP' } :
    f === 'clips-following' ? { kind: 'CLIP', ...fol } :
    f === 'user' ? { author: { profile: { username: u.searchParams.get('username') ?? '' } } } : {};
  const rows = await prisma.post.findMany({
    where: { AND: [visibleTo(me.id), extra] }, select: postSelect(me.id),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 11, ...(cur ? { cursor: { id: cur }, skip: 1 } : {}),
  });
  const page = rows.slice(0, 10);
  return ok({ items: page.map((p) => shape(p, me.id)), next: rows.length > 10 ? page[9].id : null });
});

export const POST = route(async (req, _c, me) => {
  if (!hit('post:' + me.id, 20, 3_600_000)) return fail('You are posting too fast. Try again later.', 429);
  const fd = await req.formData(), file = fd.get('file');
  if (!(file instanceof File)) return fail('Choose a photo or video.');
  const caption = z.string().max(500, 'Caption is too long').parse(String(fd.get('caption') ?? '').trim());
  const audience = z.enum(['PUBLIC', 'FOLLOWERS']).parse(fd.get('audience') ?? 'PUBLIC');
  const { name, kind } = await saveUpload(file, ['image', 'video']);
  const post = await prisma.post.create({ data: { authorId: me.id, kind: kind === 'video' ? 'CLIP' : 'PHOTO', mediaPath: name, caption, audience }, select: postSelect(me.id) });
  return ok(shape(post, me.id), 201);
});
