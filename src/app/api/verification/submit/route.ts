import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { saveUpload } from '@/lib/media';

// Step 2: upload the selfie. It is stored privately and only an administrator can open it.
export const POST = route(async (req, _c, me) => {
  const v = await prisma.verification.findFirst({ where: { userId: me.id, status: 'STARTED', createdAt: { gt: new Date(Date.now() - 3600_000) } }, orderBy: { createdAt: 'desc' } });
  if (!v) return fail('Start again: your code has expired.');
  const f = (await req.formData()).get('selfie');
  if (!(f instanceof File)) return fail('Choose a selfie.');
  const { name } = await saveUpload(f, ['image']);
  await prisma.verification.update({ where: { id: v.id }, data: { selfiePath: name, status: 'PENDING' } });
  return ok({ ok: true });
});
