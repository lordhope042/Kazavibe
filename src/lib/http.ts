import { z } from 'zod';
import { currentUser, type Me } from './auth';

export class HttpError extends Error { constructor(m: string, public status = 400) { super(m); } }
export const ok = (d: unknown, s = 200) => Response.json(d, { status: s });
export const fail = (m: string, s = 400) => Response.json({ error: m }, { status: s });

type Handler = (req: Request, ctx: any, me: Me) => Promise<Response>;
/** Wraps a handler: same-origin check on writes, auth, validation + error mapping. */
export const route = (h: Handler, auth = true, allowUnverified = false) => async (req: Request, ctx: any) => {
  try {
    if (req.method !== 'GET') {
      const o = req.headers.get('origin');
      if (o && ![req.headers.get('host'), req.headers.get('x-forwarded-host')].includes(new URL(o).host)) return fail('Bad origin', 403);
    }
    const me = await currentUser();
    if (auth && !me) return fail('Sign in required', 401);
    if (auth && !allowUnverified && me!.email && !me!.emailVerifiedAt) return fail('Please verify your email first.', 403);
    return await h(req, ctx, me as Me);
  } catch (e) {
    if (e instanceof z.ZodError) return fail(e.issues[0].message, 400);
    if (e instanceof HttpError) return fail(e.message, e.status);
    console.error(e);
    return fail('Something went wrong', 500);
  }
};
/** Staff-only routes. ADMIN may do everything; pass ['ADMIN'] for admin-only actions. */
export const staff = (h: Handler, roles: string[] = ['ADMIN', 'MODERATOR']) =>
  route(async (req, ctx, me) => (roles.includes(me.role) ? h(req, ctx, me) : fail('Not allowed', 403)));
