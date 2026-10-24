'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import { api } from '@/lib/client';

type Card = { username: string; displayName: string; area: string; intent: string | null; verified: boolean; interests: string[]; common: string[]; bio: string; avatarUrl: string | null };
const TABS = [['discover', 'Meet'], ['likes', 'Likes you'], ['matches', 'Matches']] as const;

export default function ConnectClient() {
  const [tab, setTab] = useState<'discover' | 'likes' | 'matches'>('discover');
  const [enabled, setEnabled] = useState<boolean | null>(null), [cards, setCards] = useState<Card[]>([]), [info, setInfo] = useState<any>(null);
  const [likes, setLikes] = useState<any>(null), [matches, setMatches] = useState<any[] | null>(null), [match, setMatch] = useState<{ username: string; displayName: string } | null>(null);
  const [intent, setIntent] = useState('Dating'), [err, setErr] = useState(''), [busy, setBusy] = useState(false);

  const loadCards = useCallback(async () => { const x = await api<any>('/api/connections/suggestions'); if (x.ok) { setEnabled(x.data.enabled); setCards(x.data.items); } }, []);
  const loadInfo = useCallback(async () => { const x = await api('/api/plan'); if (x.ok) setInfo(x.data); }, []);
  const loadLikes = useCallback(async () => { const x = await api('/api/connections/likes'); if (x.ok) setLikes(x.data); }, []);
  const loadMatches = useCallback(async () => { const x = await api<any[]>('/api/connections/matches'); if (x.ok) setMatches(x.data); }, []);
  useEffect(() => { loadCards(); loadInfo(); }, [loadCards, loadInfo]);
  useEffect(() => { if (tab === 'likes') loadLikes(); if (tab === 'matches') loadMatches(); }, [tab, loadLikes, loadMatches]);

  async function enable() { setBusy(true); const x = await api<any>('/api/me', 'PATCH', { datingIntent: true, intent }); setBusy(false); if (x.ok) loadCards(); else setErr(x.data.error ?? 'Could not turn this on.'); }
  async function act(c: { username: string; displayName: string }, action: 'like' | 'pass') {
    setErr('');
    const x = await api<any>('/api/connections/interest', 'POST', { username: c.username, action });
    if (!x.ok) return setErr(x.data.error ?? 'Something went wrong.');
    setCards((l) => l.filter((y) => y.username !== c.username));
    setLikes((l: any) => (l ? { ...l, count: Math.max(0, l.count - 1), items: l.items.filter((y: any) => y.username !== c.username) } : l));
    if (x.data.matched) { setMatch(c); loadMatches(); }
    loadInfo();
  }
  const c = cards[0];
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-black">Connect</h1>
      <p className="mb-4 text-sm text-muted">Likes are private. They are only revealed when you both like each other.</p>
      <div className="mb-4 flex gap-2">{TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`chip ${tab === k ? 'chip-on' : ''}`}>{l}</button>)}</div>
      <p role="alert" className="mb-2 min-h-5 text-sm text-danger">{err}</p>

      {tab === 'discover' && (enabled === null ? <p className="text-muted">Loading…</p> : !enabled ? (
        <div className="card space-y-3 p-6 text-center"><i className="fa-solid fa-heart text-3xl text-brand-500" /><h2 className="font-bold">Turn on Connect</h2>
          <p className="text-sm text-soft">Opt in to meet people for dating or a serious relationship. You can switch it off any time in Settings. Following or liking a post never counts as romantic interest.</p>
          <select aria-label="I am looking for" value={intent} onChange={(e) => setIntent(e.target.value)} className="inp"><option>Friends</option><option>Dating</option><option>Marriage</option></select>
          <button className="btn w-full" disabled={busy} onClick={enable}>Turn on</button></div>
      ) : !c ? <div className="card p-8 text-center text-soft">You&apos;ve seen everyone for now. Check back soon, or invite friends to join.</div> : (
        <div className="card p-5 text-center shadow-xl">
          <div className="flex justify-center"><Avatar src={c.avatarUrl} name={c.displayName} size={128} /></div>
          <h2 className="mt-3 text-xl font-black">{c.displayName}{c.verified && <i className="fa-solid fa-circle-check ml-1.5 text-sm text-brand-500" />}</h2>
          <p className="text-sm text-muted"><i className="fa-solid fa-location-dot" /> {c.area}{c.intent && <> · <span className="text-brand-500">{c.intent}</span></>}</p>
          {c.bio && <p className="mt-3 text-sm text-soft">{c.bio}</p>}
          {c.interests.length > 0 && <div className="mt-3 flex flex-wrap justify-center gap-1.5">{c.interests.map((i) => <span key={i} className={`chip ${c.common.includes(i) ? 'chip-on' : ''}`}>{i}</span>)}</div>}
          {c.common.length > 0 && <p className="mt-2 text-xs text-brand-500">{c.common.length} thing{c.common.length > 1 ? 's' : ''} in common</p>}
          <div className="mt-5 flex gap-3"><button className="btn-ghost flex-1" onClick={() => act(c, 'pass')}><i className="fa-solid fa-xmark mr-1.5" />Not now</button><button className="btn flex-1" onClick={() => act(c, 'like')}><i className="fa-solid fa-heart mr-1.5" />Like</button></div>
          {info && <p className="mt-3 text-xs text-muted">{info.likesLeft} of {info.likesPerDay} likes left today{info.plan === 'FREE' && ' · Plus gives you more'}</p>}
        </div>))}
      {tab === 'discover' && enabled && (
        <div className="card mt-4 p-4 text-xs text-soft"><b className="text-fg"><i className="fa-solid fa-shield-halved mr-1.5 text-brand-500" />Meeting someone?</b><ul className="mt-1 list-disc space-y-0.5 pl-5"><li>Meet in a public place first, and tell a friend or family member.</li><li>Never send money to someone you haven&apos;t met.</li><li>Block and report anyone who makes you uncomfortable.</li></ul></div>)}

      {tab === 'likes' && (likes === null ? <p className="text-muted">Loading…</p> : likes.locked ? (
        <div className="card space-y-2 p-6 text-center"><i className="fa-solid fa-lock text-2xl text-brand-500" /><h2 className="font-bold">{likes.count} {likes.count === 1 ? 'person likes' : 'people like'} you</h2><p className="text-sm text-soft">Seeing who liked you is a Plus feature.</p><Link href="/plus" className="btn btn-sm mt-1 inline-block">Get Plus</Link></div>
      ) : likes.items.length === 0 ? <div className="card p-8 text-center text-soft">No new likes right now.</div> : (
        <ul className="space-y-2">{likes.items.map((p: any) => (
          <li key={p.username} className="card flex items-center gap-3 p-3"><Avatar src={p.avatarUrl} name={p.displayName} size={48} /><div className="min-w-0 flex-1"><b className="block truncate text-sm">{p.displayName}</b><span className="text-xs text-muted">{p.area}{p.intent && ` · ${p.intent}`}</span></div>
            <button className="btn-ghost btn-sm" onClick={() => act(p, 'pass')}>Pass</button><button className="btn btn-sm" onClick={() => act(p, 'like')}>Like back</button></li>))}</ul>))}

      {tab === 'matches' && (matches === null ? <p className="text-muted">Loading…</p> : matches.length === 0 ? <div className="card p-8 text-center text-soft">No matches yet. Keep meeting people.</div> : (
        <ul className="space-y-2">{matches.map((m) => <li key={m.username} className="card flex items-center gap-3 p-3"><Avatar src={m.avatarUrl} name={m.displayName} size={48} /><Link href={`/profile/${m.username}`} className="min-w-0 flex-1"><b className="block truncate text-sm">{m.displayName}</b><span className="text-xs text-muted">{m.area}</span></Link><Link href={`/messages?u=${m.username}`} className="btn btn-sm">Message</Link></li>)}</ul>))}

      {match && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="It's a match"><div className="card w-full max-w-sm space-y-3 p-6 text-center"><i className="fa-solid fa-heart text-4xl text-brand-500" /><h2 className="text-2xl font-black">It&apos;s a match!</h2><p className="text-sm text-soft">You and {match.displayName} liked each other.</p><Link href={`/messages?u=${match.username}`} className="btn block">Say hello</Link><button className="btn-ghost w-full" onClick={() => setMatch(null)}>Keep browsing</button></div></div>}
    </div>
  );
}
