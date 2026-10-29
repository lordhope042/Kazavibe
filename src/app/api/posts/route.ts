import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { saveUpload, type Kind } from '@/lib/media';
import { claimUpload } from '@/lib/uploads';
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
  let name: string, kind: Kind, caption: string, audience: 'PUBLIC' | 'FOLLOWERS';
  if (req.headers.get('content-type')?.includes('application/json')) { // the file was already uploaded straight to storage
    const b = z.object({ name: z.string(), ticket: z.string(), caption: z.string().max(500, 'Caption is too long').nullish(), audience: z.enum(['PUBLIC', 'FOLLOWERS']).nullish() }).parse(await req.json());
    ({ name, kind } = await claimUpload(me.id, 'post', b.name, b.ticket)); caption = (b.caption ?? '').trim(); audience = b.audience ?? 'PUBLIC';
  } else {
    const fd = await req.formData(), file = fd.get('file');
    if (!(file instanceof File)) return fail('Choose a photo or video.');
    caption = z.string().max(500, 'Caption is too long').parse(String(fd.get('caption') ?? '').trim());
    audience = z.enum(['PUBLIC', 'FOLLOWERS']).parse(fd.get('audience') ?? 'PUBLIC');
    ({ name, kind } = await saveUpload(file, ['image', 'video']));
  }
  const post = await prisma.post.create({ data: { authorId: me.id, kind: kind === 'video' ? 'CLIP' : 'PHOTO', mediaPath: name, caption, audience }, select: postSelect(me.id) });
  return ok(shape(post, me.id), 201);
});
