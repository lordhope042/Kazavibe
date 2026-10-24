import { clearSession } from '@/lib/auth';
import { route, ok } from '@/lib/http';
export const POST = route(async () => { clearSession(); return ok({ ok: true }); }, false);
