'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from './Logo';
import { api } from '@/lib/client';

export default function VerifyEmail({ masked }: { masked: string }) {
  const r = useRouter();
  const [code, setCode] = useState(''), [err, setErr] = useState(''), [info, setInfo] = useState(''), [wait, setWait] = useState(45), [busy, setBusy] = useState(false);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    const x = await api<any>('/api/auth/verify-email', 'POST', { code });
    setBusy(false);
    if (x.ok) { r.push('/onboarding'); r.refresh(); } else setErr(x.data.error ?? 'Could not verify.');
  }
  async function resend() {
    setErr(''); setInfo('');
    const x = await api<any>('/api/auth/resend-code', 'POST');
    if (x.ok) { setInfo('A new code is on its way.'); setWait(45); } else setErr(x.data.error ?? 'Could not resend.');
  }
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); r.push('/register'); r.refresh(); }
  return (
    <main className="card mx-auto my-8 max-w-sm p-6 text-center">
      <Logo />
      <i className="fa-regular fa-envelope mt-5 text-3xl text-brand-500" />
      <h1 className="mt-2 text-xl font-black">Check your email</h1>
      <p className="mt-1 text-sm text-soft">We sent a 6-digit code to <b className="text-fg">{masked}</b>. It expires in 10 minutes. Check your spam folder if you can&apos;t see it.</p>
      <form onSubmit={verify} className="mt-5">
        <label htmlFor="code" className="sr-only">Verification code</label>
        <input id="code" className="inp text-center text-2xl font-bold tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" autoFocus />
        <p role="alert" className="mt-3 min-h-5 text-sm text-danger">{err}</p>
        <p role="status" className="min-h-5 text-sm text-good">{info}</p>
        <button className="btn mt-1 w-full" disabled={busy || code.length !== 6}>Verify</button>
      </form>
      <div className="mt-4 flex items-center justify-center gap-4 text-sm">
        <button className="text-brand-500 underline disabled:text-muted disabled:no-underline" disabled={wait > 0} onClick={resend}>{wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}</button>
        <button className="text-muted underline" onClick={logout}>Use a different email</button>
      </div>
    </main>
  );
}
