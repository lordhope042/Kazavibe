import { route, ok } from '@/lib/http';
export const GET = route(async () => ok({ key: process.env.VAPID_PUBLIC_KEY ?? null }));
