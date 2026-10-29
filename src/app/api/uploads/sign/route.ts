import { z } from 'zod';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { createSignedUpload, isDirect } from '@/lib/storage';
import { makeTicket, planUpload } from '@/lib/uploads';

const S = z.object({
  purpose: z.enum(['post', 'avatar', 'chat', 'voice', 'selfie']), mime: z.string().max(120), size: z.number().int().positive().max(50 * 1024 * 1024),
  filename: z.string().max(200).optional(),
});
// Step 1 of a direct upload. When files are stored on this server's own disk (development) we answer {direct:false} and the browser uses the normal upload.
export const POST = route(async (req, _c, me) => {
  const b = S.parse(await req.json());
  if (!hit('sign:' + me.id, 80, 3_600_000)) return fail('Too many uploads. Try again later.', 429);
  if (!isDirect()) return ok({ direct: false });
  const name = planUpload(b.purpose, b.mime, b.filename, b.size);
  return ok({ direct: true, name, ticket: makeTicket(me.id, name, b.purpose), url: await createSignedUpload(name) });
});
