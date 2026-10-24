'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from './Logo';
import { useT } from './LangProvider';

const Field = ({ id, label, ...p }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="mt-4"><label htmlFor={id} className="mb-1 block text-sm text-soft">{label}</label><input id={id} name={id} className="inp" {...p} /></div>
);

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const r = useRouter(), t = useT(), reg = mode === 'register';
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr('');
    const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, unknown>;
    if (reg) { if (d.password !== d.confirm) return setErr(t('pw_mismatch')); d.acceptTerms = d.acceptTerms === 'on'; }
    setBusy(true);
    const res = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    setBusy(false);
    if (res.ok) { r.push(reg ? '/verify-email' : '/home'); r.refresh(); }
    else setErr((await res.json().catch(() => ({}))).error ?? 'Something went wrong.');
  }
  return (
    <main className="card mx-auto my-8 max-w-sm p-6">
      <div className="text-center"><Link href="/"><Logo /></Link></div>
      <h1 className="mt-6 text-center text-2xl font-bold">{reg ? t('create_your_account') : t('welcome_back')}</h1>
      <p className="text-center text-sm text-muted">{reg ? t('join_sub') : t('login_sub')}</p>
      <form onSubmit={submit} noValidate>
        {reg && <Field id="name" label={t('full_name')} autoComplete="name" required />}
        <Field id="contact" label={reg ? t('email_address') : t('email_or_phone')} type={reg ? 'email' : 'text'} autoComplete="username" required />
        <Field id="password" label={t('password')} type="password" autoComplete={reg ? 'new-password' : 'current-password'} required />
        {!reg && <p className="mt-2 text-right text-sm"><Link className="text-brand-500 underline" href="/forgot-password">{t('forgot_password')}</Link></p>}
        {reg && <>
          <Field id="confirm" label={t('confirm_password')} type="password" autoComplete="new-password" required />
          <Field id="dateOfBirth" label={t('dob')} type="date" required />
          <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" name="acceptTerms" /> {t('accept_terms')}</label>
        </>}
        <p role="alert" className="mt-3 min-h-5 text-sm text-danger">{err}</p>
        <button className="btn mt-2 w-full" disabled={busy}>{busy ? t('please_wait') : reg ? t('create_account') : t('log_in')}</button>
      </form>
      {!reg && <p className="mt-3 text-center text-sm"><Link className="text-brand-500 underline" href="/login/phone">{t('phone_code')}</Link></p>}
      <p className="mt-4 text-center text-sm text-soft">
        {reg ? <>{t('already_member')} <Link className="underline" href="/login">{t('log_in')}</Link></> : <>{t('new_here')} <Link className="underline" href="/register">{t('create_account')}</Link></>}
      </p>
    </main>
  );
}
