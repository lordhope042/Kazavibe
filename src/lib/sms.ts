/** SMS_PROVIDER=console prints the message in the terminal. SMS_PROVIDER=termii sends real SMS (check Termii's docs for your sender ID/route). */
export async function sendSms(to: string, text: string) {
  const mode = process.env.SMS_PROVIDER ?? 'console';
  if (mode === 'console') { console.log(`\n[sms -> ${to}] ${text}\n`); return; }
  if (mode === 'termii') {
    const key = process.env.TERMII_API_KEY;
    if (!key) throw new Error('TERMII_API_KEY is not set in .env');
    const r = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify({ to: to.replace('+', ''), from: process.env.TERMII_SENDER_ID || 'N-Alert', sms: text, type: 'plain', channel: 'generic', api_key: key }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || (j.code && j.code !== 'ok')) throw new Error('Termii: ' + (j.message ?? r.status));
    return;
  }
  throw new Error(`Unknown SMS_PROVIDER "${mode}"`);
}
