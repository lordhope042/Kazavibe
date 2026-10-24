import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { saveUpload, removeFile } from '@/lib/media';
export const POST = route(async (req, _c, me) => {
  if (!hit('avatar:' + me.id, 10, 3_600_000)) return fail('Too many changes. Try again later.', 429);
  const f = (await req.formData()).get('file');
  if (!(f instanceof File)) return fail('Choose a photo.');
  const { name } = await saveUpload(f, ['image']);
  await prisma.profile.update({ where: { userId: me.id }, data: { avatarPath: name } });
  await removeFile(me.profile?.avatarPath);
  return ok({ avatarUrl: `/api/media/${name}` });
});
