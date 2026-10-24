import { fulfill, verifySignature } from '@/lib/billing';

// Paystack calls this (set the URL in your Paystack dashboard). No session: the signature is the authentication.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get('x-paystack-signature') ?? '')) return new Response('Invalid signature', { status: 401 });
  let ev: any; try { ev = JSON.parse(raw); } catch { return new Response('Bad request', { status: 400 }); }
  if (ev.event === 'charge.success' && ev.data?.reference) {
    try { await fulfill(String(ev.data.reference)); } catch (e) { console.error('Webhook fulfil failed', e); return new Response('Retry later', { status: 500 }); } // 500 makes Paystack retry
  }
  return new Response('ok');
}
