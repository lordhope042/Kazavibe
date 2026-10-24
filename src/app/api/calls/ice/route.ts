import { createHmac } from 'crypto';
import { route, ok } from '@/lib/http';

// STUN lets phones find each other. TURN (a relay) is what makes calls work on mobile data and strict networks.
export const GET = route(async (_r, _c, me) => {
  const servers: any[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const urls = process.env.TURN_URLS?.split(',').map((s) => s.trim()).filter(Boolean);
  if (urls?.length) {
    if (process.env.TURN_SECRET) { // coturn "use-auth-secret": short-lived credentials made per call
      const username = `${Math.floor(Date.now() / 1000) + 3600}:${me.id}`;
      servers.push({ urls, username, credential: createHmac('sha1', process.env.TURN_SECRET).update(username).digest('base64') });
    } else if (process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) servers.push({ urls, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  }
  return ok({ iceServers: servers, relay: servers.length > 1 });
});
