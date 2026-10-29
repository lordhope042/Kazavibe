'use client';
import { postUpload } from '@/lib/upload';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from './Avatar';
import { AREAS } from '@/lib/areas';
import { api } from '@/lib/client';

type P = { displayName: string; username: string; bio: string; interests: string[]; area: string; visibility: 'PUBLIC' | 'PRIVATE'; datingIntent: boolean; locationPaused: boolean; avatarUrl: string | null; intent: string | null; hidePhoto: boolean; plan: 'FREE' | 'PLUS' };
const L = 'mb-1 mt-4 block text-sm text-soft';
const Sw = ({ on, set, label, hint, lock }: { on: boolean; set: (v: boolean) => void; label: string; hint: string; lock?: boolean }) => (
  <div className="flex items-center justify-between gap-3 border-b border-line py-3"><div><b className="text-sm">{label}</b><p className="text-xs text-muted">{hint}</p></div>
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={lock} onClick={() => set(!on)} className={`relative h-6 w-11 shrink-0 rounded-full border border-line transition ${on ? 'bg-brand-600' : 'bg-input'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-5' : 'left-0.5'}`} /></button></div>
);

export default function SettingsForm({ initial }: { initial: P }) {
  const r = useRouter();
  const [msg, setMsg] = useState(''), [bad, setBad] = useState(false), [reqs, setReqs] = useState<any[]>([]), [blocked, setBlocked] = useState<any[]>([]);
  const [dating, setDating] = useState(initial.datingIntent), [hide, setHide] = useState(initial.hidePhoto), [paused, setPaused] = useState(initial.locationPaused), [avatar, setAvatar] = useState(initial.avatarUrl);
  useEffect(() => { api<any[]>('/api/follow-requests').then((x) => x.ok && setReqs(x.data)); api<any[]>('/api/blocks').then((x) => x.ok && setBlocked(x.data)); }, []);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const x = await api<any>('/api/me', 'PATCH', { displayName: f.get('displayName'), username: String(f.get('username')).toLowerCase(), bio: f.get('bio'), area: f.get('area'), visibility: f.get('visibility'), datingIntent: dating, locationPaused: paused, intent: f.get('intent') || undefined, hidePhoto: initial.plan === 'PLUS' ? hide : false, interests: String(f.get('interests')).split(',').map((s) => s.trim()).filter(Boolean) });
    setBad(!x.ok); setMsg(x.ok ? 'Saved.' : x.data.error ?? 'Could not save.'); if (x.ok) r.refresh();
  }
  async function photo(file?: File) {
    if (!file) return;
    const { ok, data: d } = await postUpload('/api/me/avatar', file, 'avatar');
    const res = { ok };
    setBad(!res.ok); setMsg(res.ok ? 'Photo updated.' : d.error ?? 'Upload failed.'); if (res.ok) { setAvatar(d.avatarUrl + '?' + Date.now()); r.refresh(); }
  }
  async function act(id: string, action: 'approve' | 'decline') { if ((await api(`/api/follow-requests/${id}`, 'POST', { action })).ok) setReqs((l) => l.filter((x) => x.id !== id)); }
  async function unblock(u: string) { if ((await api('/api/blocks', 'DELETE', { username: u })).ok) setBlocked((l) => l.filter((x) => x.username !== u)); }
  async function remove() {
    const password = prompt('This permanently deletes your account, posts and messages. Enter your password to confirm:');
    if (!password) return;
    const x = await api<any>('/api/me', 'DELETE', { password });
    if (x.ok) { r.push('/'); r.refresh(); } else { setBad(true); setMsg(x.data.error ?? 'Could not delete account.'); }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-black">Settings</h1>
      <form onSubmit={save} className="card p-5">
        <div className="flex items-center gap-4"><Avatar src={avatar} name={initial.displayName} size={72} /><label className="btn-ghost btn-sm cursor-pointer">Change photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => photo(e.target.files?.[0])} /></label></div>
        <label className={L} htmlFor="displayName">Display name</label><input id="displayName" name="displayName" className="inp" defaultValue={initial.displayName} />
        <label className={L} htmlFor="username">Username</label><input id="username" name="username" className="inp" defaultValue={initial.username} />
        <label className={L} htmlFor="bio">Bio</label><textarea id="bio" name="bio" rows={3} maxLength={300} className="inp" defaultValue={initial.bio} />
        <label className={L} htmlFor="interests">Interests (comma separated)</label><input id="interests" name="interests" className="inp" defaultValue={initial.interests.join(', ')} />
        <label className={L} htmlFor="area">Area</label><select id="area" name="area" className="inp" defaultValue={initial.area}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select>
        <label className={L} htmlFor="visibility">Profile visibility</label>
        <select id="visibility" name="visibility" className="inp" defaultValue={initial.visibility}><option value="PUBLIC">Public: anyone can follow you</option><option value="PRIVATE">Private: you approve each follower</option></select>
        <div className="mt-3"><Sw on={dating} set={setDating} label="Open to dating" hint="Optional. Following or liking is never treated as romantic interest." /><Sw on={!paused} set={(v) => setPaused(!v)} label="Show me in Nearby" hint="Turn off to pause location-based discovery." /></div>
        <label className={L} htmlFor="intent">Looking for</label>
        <select id="intent" name="intent" className="inp" defaultValue={initial.intent ?? ''}><option value="">Not set</option><option>Friends</option><option>Dating</option><option>Marriage</option></select>
        <div className="mt-3"><Sw on={hide && initial.plan === 'PLUS'} set={setHide} lock={initial.plan !== 'PLUS'} label={`Hide my profile photo until we match${initial.plan !== 'PLUS' ? ' (Plus)' : ''}`} hint={initial.plan === 'PLUS' ? 'Only you and your matches can see your profile photo.' : 'A Plus feature. Get it under KazaVibe Plus in your account menu. Blocking, reporting and private profiles stay free.'} /></div>
        <p role="status" className={`mt-3 min-h-5 text-sm ${bad ? 'text-danger' : 'text-good'}`}>{msg}</p>
        <button className="btn mt-2">Save changes</button>
      </form>
      <div className="card p-5"><h2 className="mb-2 font-bold">Follow requests</h2>
        {reqs.length === 0 ? <p className="text-sm text-muted">No pending requests.</p> : <ul className="space-y-2">{reqs.map((q) => <li key={q.id} className="flex items-center gap-3"><div className="flex-1 text-sm"><b>{q.displayName}</b> <span className="text-muted">@{q.username}</span></div><button className="btn btn-sm" onClick={() => act(q.id, 'approve')}>Approve</button><button className="btn-ghost btn-sm" onClick={() => act(q.id, 'decline')}>Decline</button></li>)}</ul>}</div>
      <div className="card p-5"><h2 className="mb-2 font-bold">Blocked accounts</h2>
        {blocked.length === 0 ? <p className="text-sm text-muted">You haven&apos;t blocked anyone.</p> : <ul className="space-y-2">{blocked.map((b) => <li key={b.username} className="flex items-center gap-3"><div className="flex-1 text-sm"><b>{b.displayName}</b> <span className="text-muted">@{b.username}</span></div><button className="btn-ghost btn-sm" onClick={() => unblock(b.username)}>Unblock</button></li>)}</ul>}</div>
      <div className="card border-danger/40 p-5"><h2 className="font-bold text-danger">Delete account</h2><p className="my-2 text-sm text-soft">Removes your profile, posts, messages and uploaded media. This cannot be undone.</p><button className="btn-ghost btn-sm !border-danger/50 !text-danger" onClick={remove}>Delete my account</button></div>
    </div>
  );
}
