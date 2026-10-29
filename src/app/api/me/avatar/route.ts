import { z } from 'zod';
import { prisma } from '@/lib/db';
import { claimUpload } from '@/lib/uploads';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { saveUpload, removeFile } from '@/lib/media';
export const POST = route(async (req, _c, me) => {
  if (!hit('avatar:' + me.id, 10, 3_600_000)) return fail('Too many changes. Try again later.', 429);
  let name: string;
  if (req.headers.get('content-type')?.includes('application/json')) {
    const b = z.object({ name: z.string(), ticket: z.string() }).parse(await req.json());
    ({ name } = await claimUpload(me.id, 'avatar', b.name, b.ticket));
  } else {
    const f = (await req.formData()).get('file');
    if (!(f instanceof File)) return fail('Choose a photo.');
    ({ name } = await saveUpload(f, ['image']));
  }
  await prisma.profile.update({ where: { userId: me.id }, data: { avatarPath: name } });
  await removeFile(me.profile?.avatarPath);
  return ok({ avatarUrl: `/api/media/${name}` });
});
