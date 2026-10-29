'use client';
import { postUpload } from '@/lib/upload';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from './Avatar';
import Logo from './Logo';
import { AREAS } from '@/lib/areas';
import { api } from '@/lib/client';

const INTERESTS = ['Music', 'Dancing', 'Travel', 'Food', 'Fashion', 'Football', 'Tech', 'Photography', 'Art', 'Comedy', 'Reading', 'Cooking'];
const STEPS = ['Photo', 'About you', 'Location', 'Privacy', 'Verify'];

export default function OnboardingClient({ name, avatarUrl, area }: { name: string; avatarUrl: string | null; area: string }) {
  const r = useRouter();
  const [step, setStep] = useState(0), [av, setAv] = useState(avatarUrl), [gender, setGender] = useState(''), [bio, setBio] = useState(''), [ints, setInts] = useState<string[]>([]);
  const [ar, setAr] = useState(area), [vis, setVis] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC'), [dating, setDating] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function photo(f?: File) {
    if (!f) return; setErr('');
    const { ok, data: d } = await postUpload('/api/me/avatar', f, 'avatar');
    const res = { ok };
    if (res.ok) setAv(d.avatarUrl); else setErr(d.error ?? 'Upload failed.');
  }
  async function finish() {
    setBusy(true);
    const x = await api<any>('/api/me', 'PATCH', { ...(gender ? { gender } : {}), bio, interests: ints, area: ar, visibility: vis, datingIntent: dating, onboarded: true });
    setBusy(false);
    if (!x.ok) return setErr(x.data.error ?? 'Could not save.');
    r.push('/home'); r.refresh();
  }
  const toggle = (i: string) => setInts((l) => (l.includes(i) ? l.filter((x) => x !== i) : l.length < 10 ? [...l, i] : l));
  return (
    <main className="card mx-auto my-8 max-w-md p-6">
      <div className="mb-4 text-center"><Logo /></div>
      <ol className="mb-5 flex gap-1.5" aria-label="Progress">{STEPS.map((s, i) => <li key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand-600' : 'bg-input'}`} aria-current={i === step ? 'step' : undefined} title={s} />)}</ol>
      <h1 className="text-xl font-black">{['Add a profile photo', 'Tell us about you', 'Where in Kazaure are you?', 'Your privacy', 'Verification'][step]}</h1>
      <div className="mt-4 space-y-4">
        {step === 0 && <div className="flex flex-col items-center gap-3"><Avatar src={av} name={name} size={120} /><label className="btn-ghost cursor-pointer">Choose photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => photo(e.target.files?.[0])} /></label><p className="text-xs text-muted">Use a clear photo of yourself. You can change it later.</p></div>}
        {step === 1 && <>
          <div><p className="mb-1.5 text-sm text-soft">Gender (optional)</p><div className="flex flex-wrap gap-2">{['Female', 'Male', 'Other', 'Prefer not to say'].map((g) => <button key={g} type="button" onClick={() => setGender(g)} className={`chip ${gender === g ? 'chip-on' : ''}`} aria-pressed={gender === g}>{g}</button>)}</div></div>
          <div><label htmlFor="bio" className="mb-1.5 block text-sm text-soft">Bio</label><textarea id="bio" className="inp" rows={3} maxLength={300} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A line about you" /></div>
          <div><p className="mb-1.5 text-sm text-soft">Interests</p><div className="flex flex-wrap gap-2">{INTERESTS.map((i) => <button key={i} type="button" onClick={() => toggle(i)} className={`chip ${ints.includes(i) ? 'chip-on' : ''}`} aria-pressed={ints.includes(i)}>{i}</button>)}</div></div></>}
        {step === 2 && <div><p className="mb-2 text-sm text-soft">Pick your area. We never ask for GPS and never show exact locations.</p><div className="flex flex-wrap gap-2">{AREAS.map((a) => <button key={a} type="button" onClick={() => setAr(a)} className={`chip ${ar === a ? 'chip-on' : ''}`} aria-pressed={ar === a}>{a}</button>)}</div></div>}
        {step === 3 && <div className="space-y-3">
          {([['PUBLIC', 'Public profile', 'Anyone can follow you and see your posts.'], ['PRIVATE', 'Private profile', 'You approve every follower.']] as const).map(([v, t, d]) => <button key={v} type="button" onClick={() => setVis(v)} aria-pressed={vis === v} className={`w-full rounded-2xl border p-3 text-left ${vis === v ? 'border-brand-600 bg-brand-600/10' : 'border-line'}`}><b className="text-sm">{t}</b><p className="text-xs text-muted">{d}</p></button>)}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={dating} onChange={(e) => setDating(e.target.checked)} /> I&apos;m open to dating (optional, you can change this any time)</label></div>}
        {step === 4 && <div className="rounded-2xl border border-line p-4 text-sm text-soft"><i className="fa-solid fa-shield-halved mb-2 text-xl text-brand-500" /><p>You can get a verified badge later from Settings. An administrator reviews a selfie you choose to send, then deletes it. It&apos;s optional, and your account works fully without it.</p></div>}
      </div>
      <p role="alert" className="mt-3 min-h-5 text-sm text-danger">{err}</p>
      <div className="mt-2 flex gap-2">
        {step > 0 && <button className="btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
        <button className="btn flex-1" disabled={busy} onClick={() => (step < 4 ? setStep(step + 1) : finish())}>{step < 4 ? (step === 0 && !av ? 'Skip for now' : 'Continue') : busy ? 'Saving…' : 'Finish'}</button>
      </div>
    </main>
  );
}
