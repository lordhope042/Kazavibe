import webpush from 'web-push';
import { prisma } from './db';

let ready = false;
function init() {
  if (ready) return true;
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
  return (ready = true);
}
/** Sends a push to every device the member turned notifications on for. Dead subscriptions are removed. Never throws. */
export async function pushTo(userId: string, p: { title: string; body: string; url: string; tag?: string }) {
  if (!init()) return;
  try {
    const subs = await prisma.pushSub.findMany({ where: { userId } });
    await Promise.all(subs.map(async (s) => {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(p), { TTL: 3600 }); }
      catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await prisma.pushSub.deleteMany({ where: { id: s.id } }); else console.error('push failed', e?.statusCode); }
    }));
  } catch (e) { console.error('push error', e); }
}
// Message pushes show who wrote, never what they wrote (lock-screen privacy).
export const pushMessage = (to: string, from: string, kind: string, request: boolean) =>
  pushTo(to, { title: from, body: request ? 'Sent you a message request' : kind === 'VOICE' ? 'Sent you a voice note' : 'Sent you a message', url: '/messages', tag: 'msg-' + from });
