'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from './Logo';
import { api } from '@/lib/client';

export default function PhoneLogin() {
  const r = useRouter();
  const [step, setStep] = useState<'phone' | 'code'>('phone'), [phone, setPhone] = useState(''), [code, setCode] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) { e.preventDefault(); setErr(''); setBusy(true); const x = await api<any>('/api/auth/phone-login/request', 'POST', { phone }); setBusy(false); if (x.ok) setStep('code'); else setErr(x.data.error ?? 'Enter a valid phone number.'); }
  async function verify(e: React.FormEvent) { e.preventDefault(); setErr(''); setBusy(true); const x = await api<any>('/api/auth/phone-login/verify', 'POST', { phone, code }); setBusy(false); if (x.ok) { r.push('/home'); r.refresh(); } else setErr(x.data.error ?? 'Could not sign in.'); }
  return (
    <main className="card mx-auto my-8 max-w-sm p-6">
      <div className="text-center"><Link href="/"><Logo /></Link></div>
      <h1 className="mt-6 text-center text-2xl font-bold">Sign in with a phone code</h1>
      {step === 'phone' ? (
        <form onSubmit={send} noValidate><p className="text-center text-sm text-muted">We&apos;ll text a 6-digit code to the number on your account.</p>
          <label htmlFor="phone" className="mb-1 mt-4 block text-sm text-soft">Phone number</label><input id="phone" className="inp" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <p role="alert" className="mt-3 min-h-5 text-sm text-danger">{err}</p><button className="btn mt-2 w-full" disabled={busy || phone.length < 7}>Send code</button></form>
      ) : (
        <form onSubmit={verify} noValidate><p className="text-center text-sm text-muted">If <b className="text-fg">{phone}</b> is on a KazaVibe account with a verified number, a code is on its way.</p>
          <input className="inp mt-4 text-center text-2xl font-bold tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="6-digit code" placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
          <p role="alert" className="mt-3 min-h-5 text-sm text-danger">{err}</p><button className="btn mt-2 w-full" disabled={busy || code.length !== 6}>Sign in</button>
          <button type="button" className="mt-3 w-full text-sm text-muted underline" onClick={() => { setStep('phone'); setCode(''); setErr(''); }}>Use a different number</button></form>)}
      <p className="mt-4 text-center text-sm text-soft"><Link className="underline" href="/login">Sign in with a password instead</Link></p>
    </main>
  );
}
