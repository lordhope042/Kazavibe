'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

export default function PhoneSettings({ masked }: { masked: string | null }) {
  const r = useRouter();
  const [step, setStep] = useState<'view' | 'enter' | 'code'>('view'), [phone, setPhone] = useState(''), [code, setCode] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    const x = await api<any>('/api/me/phone', 'POST', { phone }); setBusy(false);
    if (x.ok) setStep('code'); else setErr(x.data.error ?? 'Could not send the code.');
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    const x = await api<any>('/api/me/phone/verify', 'POST', { phone, code }); setBusy(false);
    if (x.ok) { setStep('view'); setCode(''); r.refresh(); } else setErr(x.data.error ?? 'Could not verify.');
  }
  async function remove() { if (confirm('Remove your phone number? You will no longer be able to sign in with a phone code.') && (await api('/api/me/phone', 'DELETE')).ok) r.refresh(); }
  return (
    <div className="card space-y-3 p-5">
      <h2 className="font-bold">Phone number</h2>
      {step === 'view' && (masked
        ? <div className="flex items-center justify-between gap-3"><p className="text-sm text-soft"><i className="fa-solid fa-circle-check mr-1.5 text-good" />{masked} is verified. You can sign in with a code sent by SMS.</p><button className="btn-ghost btn-sm" onClick={remove}>Remove</button></div>
        : <div className="flex items-center justify-between gap-3"><p className="text-sm text-soft">Add a phone number to sign in with an SMS code, with no password needed.</p><button className="btn btn-sm" onClick={() => setStep('enter')}>Add number</button></div>)}
      {step === 'enter' && <form onSubmit={send} className="flex gap-2"><input className="inp" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" aria-label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} /><button className="btn" disabled={busy}>Send code</button></form>}
      {step === 'code' && <form onSubmit={verify} className="flex gap-2"><input className="inp text-center font-bold tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" aria-label="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /><button className="btn" disabled={busy || code.length !== 6}>Verify</button></form>}
      <p role="alert" className="text-sm text-danger">{err}</p>
    </div>
  );
}
