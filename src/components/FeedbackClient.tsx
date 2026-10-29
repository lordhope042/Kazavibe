'use client';
import { useState } from 'react';
import { api } from '@/lib/client';

const CATS = ['Suggestion', 'Bug or problem', 'New feature idea', 'Something I like', 'Other'];

export default function FeedbackClient() {
  const [cat, setCat] = useState(CATS[0]), [msg, setMsg] = useState(''), [rating, setRating] = useState(0), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    const x = await api<any>('/api/feedback', 'POST', { category: cat, message: msg, rating: rating || undefined });
    setBusy(false);
    if (x.ok) setDone(true); else setErr(x.data.error ?? 'Could not send your feedback. Please try again.');
  }
  if (done) return (
    <div className="mx-auto max-w-xl card p-8 text-center">
      <i className="fa-solid fa-circle-check text-4xl text-good" />
      <h1 className="mt-3 text-2xl font-black">Thank you!</h1>
      <p className="mt-1 text-soft">Your feedback reached the KazaVibe team. We read every message.</p>
      <button className="btn mt-5" onClick={() => { setDone(false); setMsg(''); setRating(0); }}>Send another</button>
    </div>
  );
  return (
    <form onSubmit={send} className="mx-auto max-w-xl space-y-4">
      <div><h1 className="text-3xl font-black">Send feedback</h1>
        <p className="mt-1 text-soft">KazaVibe is in a 10-day test. Tell us what works, what is broken and what you would like to see.</p></div>
      <div className="card space-y-4 p-5">
        <div><label className="mb-1.5 block text-sm font-semibold" htmlFor="fb-cat">What is it about?</label>
          <div id="fb-cat" className="flex flex-wrap gap-2" role="radiogroup">{CATS.map((c) => <button type="button" key={c} role="radio" aria-checked={cat === c} onClick={() => setCat(c)} className={`chip ${cat === c ? 'chip-on' : ''}`}>{c}</button>)}</div></div>
        <div><label className="mb-1.5 block text-sm font-semibold" htmlFor="fb-msg">Your message</label>
          <textarea id="fb-msg" className="inp min-h-36" maxLength={2000} required value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Describe your idea or the problem. If something broke, tell us which page and what you were doing." />
          <p className="mt-1 text-right text-xs text-muted">{msg.length}/2000</p></div>
        <div><p className="mb-1.5 text-sm font-semibold">How is KazaVibe so far? <span className="font-normal text-muted">(optional)</span></p>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(rating === n ? 0 : n)} className="p-1 text-2xl"><i className={`${n <= rating ? 'fa-solid text-brand-500' : 'fa-regular text-muted'} fa-star`} /></button>)}</div></div>
        <p role="alert" className="text-sm text-danger">{err}</p>
        <button className="btn w-full" disabled={busy || msg.trim().length < 10}>{busy ? 'Sending…' : 'Send feedback'}</button>
      </div>
      <p className="text-center text-xs text-muted">Only the KazaVibe team can read this. Please do not include passwords or card details.</p>
    </form>
  );
}
