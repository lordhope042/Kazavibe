import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hitDb } from '@/lib/ratelimit';

export const FEEDBACK_CATEGORIES = ['Suggestion', 'Bug or problem', 'New feature idea', 'Something I like', 'Other'] as const;
const S = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z.string().trim().min(10, 'Please write at least a few words (10 characters).').max(2000, 'Please keep it under 2000 characters.'),
  rating: z.number().int().min(1).max(5).optional(),
});

export const POST = route(async (req, _c, me) => {
  if (!(await hitDb('feedback:' + me.id, 10, 3_600_000))) return fail('You have sent a lot of feedback. Please try again in a while.', 429);
  const b = S.parse(await req.json());
  await prisma.feedback.create({ data: { userId: me.id, category: b.category, message: b.message, rating: b.rating } });
  return ok({ ok: true }, 201);
});
