'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;
const FREE = ['Block, report and private profile', 'Pause Nearby and message requests', 'Chat, voice notes and file sharing', '10 likes a day on Connect', 'See how many people liked you'];
const PLUS = ['Everything in Free', '50 likes a day on Connect', 'See who liked you', 'Hide your profile photo until you match', 'Voice and video calls'];

export default function PlusClient() {
  const [d, setD] = useState<any>(null), [err, setErr] = useState(''), [busy, setBusy] = useState('');
  useEffect(() => { api('/api/billing').then((x) => x.ok && setD(x.data)); }, []);
  async function buy(id: string) {
    setBusy(id); setErr('');
    const x = await api<any>('/api/billing/checkout', 'POST', { planId: id });
    if (x.ok) window.location.href = x.data.url; else { setBusy(''); setErr(x.data.error ?? 'Could not start the payment.'); }
  }
  if (!d) return <p className="text-muted">Loading…</p>;
  const plus = d.plan === 'PLUS', per1 = d.plans[0]?.priceNgn ?? 0;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center"><i className="fa-solid fa-crown text-3xl text-brand-500" /><h1 className="mt-2 text-3xl font-black">KazaVibe Plus</h1>
        <p className="mt-1 text-soft">{plus ? <>You&apos;re a Plus member until <b className="text-fg">{new Date(d.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</b>. Paying again adds to the time you have left.</> : 'Get more out of KazaVibe. Safety tools always stay free.'}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[['Free', FREE, false], ['Plus', PLUS, true]].map(([t, items, hi]) => (
          <div key={String(t)} className={`card p-5 ${hi ? 'border-brand-600' : ''}`}><h2 className="font-bold">{String(t)}</h2>
            <ul className="mt-3 space-y-2 text-sm text-soft">{(items as string[]).map((i) => <li key={i} className="flex gap-2"><i className={`fa-solid fa-check mt-1 text-xs ${hi ? 'text-brand-500' : 'text-muted'}`} />{i}</li>)}</ul></div>))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {d.plans.map((p: any) => {
          const save = p.months > 1 ? Math.round((1 - p.priceNgn / (per1 * p.months)) * 100) : 0;
          return (
            <div key={p.id} className="card flex flex-col p-5 text-center"><b>{p.label}</b><p className="my-2 text-2xl font-black">{naira(p.priceNgn)}</p><p className="mb-3 min-h-5 text-xs text-muted">{save > 0 ? `Save ${save}% · ${naira(Math.round(p.priceNgn / p.months))}/month` : 'One month'}</p>
              <button className="btn mt-auto" disabled={!!busy || !d.hasEmail} onClick={() => buy(p.id)}>{busy === p.id ? 'Opening Paystack…' : plus ? 'Add time' : 'Get Plus'}</button></div>);
        })}
      </div>
      {!d.hasEmail && <p className="text-center text-sm text-danger">Add an email address to your account before paying.</p>}
      <p role="alert" className="text-center text-sm text-danger">{err}</p>
      <p className="text-center text-xs text-muted">One-time payment for the period you choose. It does not renew automatically. Paid securely by Paystack (card, bank transfer or USSD). KazaVibe never sees or stores your card details.</p>
      {d.payments.length > 0 && (
        <div className="card p-5"><h2 className="mb-2 font-bold">Payment history</h2>
          <ul className="divide-y divide-line text-sm">{d.payments.map((p: any) => <li key={p.reference} className="flex items-center justify-between gap-3 py-2"><span className="text-soft">{new Date(p.createdAt).toLocaleDateString()} · {naira(p.amountNgn)}</span><span className={`text-xs font-semibold ${p.status === 'SUCCESS' ? 'text-good' : p.status === 'PENDING' ? 'text-muted' : 'text-danger'}`}>{p.status === 'REVIEW' ? 'UNDER REVIEW' : p.status}</span></li>)}</ul></div>)}
    </div>
  );
}
