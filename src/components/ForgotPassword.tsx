'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from './Logo';
import { api } from '@/lib/client';

export default function ForgotPassword() {
  const r = useRouter();
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email'), [email, setEmail] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    const x = await api<any>('/api/auth/forgot-password', 'POST', { email });
    setBusy(false);
    if (x.ok) setStep('reset'); else setErr(x.data.error ?? 'Something went wrong.');
  }
  async function reset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr('');
    const f = new FormData(e.currentTarget);
    if (f.get('password') !== f.get('confirm')) return setErr('Passwords do not match.');
    setBusy(true);
    const x = await api<any>('/api/auth/reset-password', 'POST', { email, code: f.get('code'), password: f.get('password') });
    setBusy(false);
    if (x.ok) { setStep('done'); setTimeout(() => r.push('/login'), 2500); } else setErr(x.data.error ?? 'Could not reset password.');
  }
  return (
    <main className="card mx-auto my-8 max-w-sm p-6">
      <div className="text-center"><Link href="/"><Logo /></Link></div>
      {step === 'email' && (<form onSubmit={send} noValidate>
        <h1 className="mt-6 text-center text-2xl font-bold">Forgot password?</h1>
        <p className="text-center text-sm text-muted">Enter your account email and we&apos;ll send you a code.</p>
        <label htmlFor="email" className="mb-1 mt-4 block text-sm text-soft">Email address</label>
        <input id="email" type="email" autoComplete="email" className="inp" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <p role="alert" className="mt-3 min-h-5 text-sm text-danger">{err}</p>
        <button className="btn mt-2 w-full" disabled={busy}>Send code</button></form>)}
      {step === 'reset' && (<form onSubmit={reset} noValidate>
        <h1 className="mt-6 text-center text-2xl font-bold">Enter your code</h1>
        <p className="text-center text-sm text-muted">If an account exists for <b className="text-fg">{email}</b>, we sent a 6-digit code. It expires in 10 minutes.</p>
        <label htmlFor="code" className="mb-1 mt-4 block text-sm text-soft">6-digit code</label>
        <input id="code" name="code" className="inp text-center text-xl font-bold tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
        <label htmlFor="password" className="mb-1 mt-4 block text-sm text-soft">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" className="inp" required />
        <label htmlFor="confirm" className="mb-1 mt-4 block text-sm text-soft">Confirm new password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="inp" required />
        <p role="alert" className="mt-3 min-h-5 text-sm text-danger">{err}</p>
        <button className="btn mt-2 w-full" disabled={busy}>Reset password</button>
        <button type="button" className="mt-3 w-full text-sm text-muted underline" onClick={() => { setStep('email'); setErr(''); }}>Use a different email</button></form>)}
      {step === 'done' && <div className="mt-6 text-center"><i className="fa-solid fa-circle-check text-3xl text-good" /><h1 className="mt-2 text-xl font-black">Password updated</h1><p className="text-sm text-soft">Taking you to the login page…</p></div>}
      <p className="mt-4 text-center text-sm text-soft"><Link className="underline" href="/login">Back to login</Link></p>
    </main>
  );
}
