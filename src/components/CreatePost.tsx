'use client';
import { postUpload } from '@/lib/upload';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreatePost({ open, onClose }: { open: boolean; onClose: () => void }) {
  const r = useRouter();
  const [file, setFile] = useState<File | null>(null), [url, setUrl] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  function reset() { setFile(null); setUrl(''); setErr(''); }
  function pick(f?: File) {
    setErr('');
    if (!f) return;
    const u = URL.createObjectURL(f);
    if (f.type.startsWith('video/')) {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => { if (v.duration > 30.5) { setErr('Clips can be 30 seconds at most.'); URL.revokeObjectURL(u); } else { setFile(f); setUrl(u); } };
      v.onerror = () => setErr('This video format is not supported by your browser.');
      v.src = u;
    } else { setFile(f); setUrl(u); }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return setErr('Choose a photo or video first.');
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { ok, data } = await postUpload('/api/posts', file, 'post', { caption: f.get('caption'), audience: f.get('audience') });
    setBusy(false);
    if (!ok) return setErr(data.error ?? 'Upload failed. Try again.');
    reset(); onClose(); window.dispatchEvent(new Event('kv:posted')); r.refresh();
  }
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Create post">
      <form onSubmit={submit} className="card max-h-[92vh] w-full max-w-md overflow-y-auto p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Create post</h2><button type="button" aria-label="Close" onClick={() => { reset(); onClose(); }} className="text-muted hover:text-fg"><i className="fa-solid fa-xmark text-lg" /></button></div>
        {url ? (file?.type.startsWith('video/') ? <video src={url} controls playsInline className="max-h-72 w-full rounded-2xl bg-black" /> : <img src={url} alt="Preview" className="max-h-72 w-full rounded-2xl object-cover" />)
          : <label className="grid h-44 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-line text-center text-muted hover:border-brand-600"><span><i className="fa-solid fa-cloud-arrow-up mb-2 text-2xl" /><br />Tap to choose a photo or video<br /><span className="text-xs">Videos up to 30 seconds</span></span>
            <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" onChange={(e) => pick(e.target.files?.[0])} /></label>}
        {url && <button type="button" className="mt-2 text-xs text-muted underline" onClick={reset}>Choose a different file</button>}
        <textarea name="caption" maxLength={500} rows={3} placeholder="Write a caption…" aria-label="Caption" className="inp mt-3" />
        <label className="mb-1 mt-3 block text-xs text-muted" htmlFor="aud">Who can see this</label>
        <select id="aud" name="audience" className="inp"><option value="PUBLIC">Public</option><option value="FOLLOWERS">Followers only</option></select>
        <p role="alert" className="mt-2 min-h-5 text-sm text-danger">{err}</p>
        <p className="text-xs text-muted">By posting you agree to the Community Guidelines.</p>
        <button className="btn mt-3 w-full" disabled={busy}>{busy ? 'Uploading…' : 'Publish'}</button>
      </form>
    </div>
  );
}
