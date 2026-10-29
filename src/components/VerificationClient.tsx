'use client';
import { postUpload } from '@/lib/upload';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

export default function VerificationClient() {
  const r = useRouter();
  const [d, setD] = useState<any>(null), [consent, setConsent] = useState(false), [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const load = () => api('/api/verification').then((x) => x.ok && setD(x.data));
  useEffect(() => { load(); }, []);
  async function start() { setErr(''); setBusy(true); const x = await api<any>('/api/verification', 'POST', { consent }); setBusy(false); if (x.ok) load(); else setErr(x.data.error ?? 'Could not start.'); }
  async function submit() {
    if (!file) return setErr('Take or choose your selfie first.');
    setErr(''); setBusy(true);
    const { ok, data: j } = await postUpload('/api/verification/submit', file, 'selfie', {}, 'selfie');
    const res = { ok };
    setBusy(false);
    if (res.ok) { setFile(null); setPreview(''); load(); r.refresh(); } else setErr(j.error ?? 'Upload failed.');
  }
  async function cancel() { await api('/api/verification', 'DELETE'); setFile(null); setPreview(''); load(); }
  if (!d) return <p className="text-muted">Loading…</p>;
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-black">Get verified</h1>
      <div className="card space-y-2 p-5 text-sm text-soft"><p><b className="text-fg">What the badge means:</b> KazaVibe&apos;s configured checks were completed. It does not guarantee a person&apos;s honesty, safety or identity documents.</p><p>An administrator compares your selfie with your profile photo. This is a person checking, not automatic face recognition.</p></div>
      {d.verified ? <div className="card p-6 text-center"><i className="fa-solid fa-circle-check text-4xl text-brand-500" /><h2 className="mt-2 text-xl font-black">You&apos;re verified</h2></div>
        : d.status === 'PENDING' ? <div className="card space-y-3 p-6 text-center"><i className="fa-solid fa-hourglass-half text-3xl text-brand-500" /><h2 className="text-xl font-black">Under review</h2><p className="text-sm text-soft">We&apos;ll notify you when an administrator has decided. Your selfie is deleted as soon as they do.</p><button className="btn-ghost btn-sm" onClick={cancel}>Withdraw and delete my selfie</button></div>
        : d.status === 'STARTED' && d.code ? (
          <div className="card space-y-4 p-5">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-soft"><li>Write this code on a piece of paper: <b className="ml-1 rounded-lg bg-input px-3 py-1 text-2xl tracking-widest text-fg">{d.code}</b></li><li>Take a clear selfie in good light, holding the paper beside your face.</li><li>Your whole face and the code must be visible.</li></ol>
            {preview ? <img src={preview} alt="Your selfie preview" className="max-h-72 rounded-2xl" /> : <label className="grid h-40 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-line text-center text-muted hover:border-brand-600"><span><i className="fa-solid fa-camera mb-1 text-2xl" /><br />Take or choose a selfie</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); } }} /></label>}
            <p role="alert" className="text-sm text-danger">{err}</p>
            <div className="flex gap-2"><button className="btn flex-1" disabled={busy || !file} onClick={submit}>{busy ? 'Sending…' : 'Send for review'}</button><button className="btn-ghost" onClick={cancel}>Cancel</button></div>
          </div>
        ) : (
          <div className="card space-y-3 p-5">
            {d.reason && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">Your last request was not approved: {d.reason}</p>}
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I agree to send a selfie to a KazaVibe administrator for review. It is stored privately, seen only by administrators, and deleted as soon as they decide (or after 14 days if not reviewed).</span></label>
            <p role="alert" className="text-sm text-danger">{err}</p>
            <button className="btn w-full" disabled={!consent || busy} onClick={start}>Start verification</button>
          </div>)}
    </div>
  );
}
