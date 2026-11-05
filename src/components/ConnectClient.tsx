'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import PhotoFill from './PhotoFill';
import { useAppUI } from './AppUI';
import { api } from '@/lib/client';
import { tap } from '@/lib/haptic';

type Card = { username: string; displayName: string; area: string; intent: string | null; verified: boolean; interests: string[]; common: string[]; bio: string; avatarUrl: string | null };
const TABS = [['discover', 'Meet'], ['likes', 'Likes you'], ['matches', 'Matches']] as const;

/** Phone: drag a card right to like, left to pass (or use the buttons). */
function SwipeDeck({ cards, onAct, left }: { cards: Card[]; onAct: (c: Card, a: 'like' | 'pass') => Promise<boolean>; left?: string }) {
  const top = cards[0], next = cards[1];
  const [dx, setDx] = useState(0), [drag, setDrag] = useState(false), [busy, setBusy] = useState(false);
  const x0 = useRef<number | null>(null);
  async function decide(dir: 1 | -1) {
    if (busy) return; setBusy(true); setDrag(false); tap(); setDx(dir * 800);
    await new Promise((r) => setTimeout(r, 220));
    await onAct(top, dir === 1 ? 'like' : 'pass');
    setDx(0); setBusy(false); // a new card appears centred; if the like was refused (daily limit) this card slides back
  }
  const end = () => { if (x0.current === null) return; x0.current = null; setDrag(false); if (Math.abs(dx) > 110) decide(dx > 0 ? 1 : -1); else setDx(0); };
  const Face = ({ c }: { c: Card }) => (
    <div className="relative h-full overflow-hidden rounded-3xl border border-line bg-card shadow-2xl">
      <PhotoFill src={c.avatarUrl} name={c.displayName} className="text-[8rem]" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-24 text-white">
        <h2 className="text-2xl font-black">{c.displayName}{c.verified && <i className="fa-solid fa-circle-check ml-2 text-base text-brand-500" />}</h2>
        <p className="text-sm text-white/80"><i className="fa-solid fa-location-dot mr-1" />{c.area}{c.intent && <> · <b className="text-amber-400">{c.intent}</b></>}</p>
        {c.bio && <p className="mt-1.5 line-clamp-2 text-sm text-white/90">{c.bio}</p>}
        {c.interests.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{c.interests.slice(0, 6).map((i) => <span key={i} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.common.includes(i) ? 'bg-brand-600 text-white' : 'bg-white/15'}`}>{i}</span>)}</div>}
        {c.common.length > 0 && <p className="mt-1.5 text-xs font-semibold text-amber-400">{c.common.length} in common</p>}
      </div>
    </div>
  );
  return (
    <div>
      <div className="relative h-[calc(100dvh-19rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[22rem]">
        {next && <div className="absolute inset-0 scale-[0.94] opacity-70" aria-hidden="true"><Face c={next} /></div>}
        <div key={top.username} className="absolute inset-0 cursor-grab select-none active:cursor-grabbing" style={{ transform: `translateX(${dx}px) rotate(${dx / 22}deg)`, transition: drag ? 'none' : 'transform .22s ease-out', touchAction: 'pan-y' }}
          onPointerDown={(e) => { if (busy) return; x0.current = e.clientX; setDrag(true); e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (x0.current !== null) setDx(e.clientX - x0.current); }} onPointerUp={end} onPointerCancel={end}>
          <Face c={top} />
          <span className="pointer-events-none absolute left-5 top-6 -rotate-12 rounded-xl border-4 border-emerald-400 px-3 py-1 text-2xl font-black text-emerald-400" style={{ opacity: Math.min(1, Math.max(0, dx) / 100) }}>LIKE</span>
          <span className="pointer-events-none absolute right-5 top-6 rotate-12 rounded-xl border-4 border-red-400 px-3 py-1 text-2xl font-black text-red-400" style={{ opacity: Math.min(1, Math.max(0, -dx) / 100) }}>NOPE</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-8">
        <button aria-label="Not now" disabled={busy} onClick={() => decide(-1)} className="grid h-16 w-16 place-items-center rounded-full border border-line bg-card text-2xl text-muted shadow-lg transition active:scale-90"><i className="fa-solid fa-xmark" /></button>
        <button aria-label="Like" disabled={busy} onClick={() => decide(1)} className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-tr from-brand-600 to-amber-500 text-3xl text-white shadow-xl shadow-brand-600/40 transition active:scale-90"><i className="fa-solid fa-heart" /></button>
      </div>
      {left && <p className="mt-3 text-center text-xs text-muted">{left}</p>}
    </div>
  );
}

export default function ConnectClient() {
  const app = useAppUI();
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
  async function act(c: { username: string; displayName: string }, action: 'like' | 'pass'): Promise<boolean> {
    setErr('');
    const x = await api<any>('/api/connections/interest', 'POST', { username: c.username, action });
    if (!x.ok) { setErr(x.data.error ?? 'Something went wrong.'); return false; }
    setCards((l) => l.filter((y) => y.username !== c.username));
    setLikes((l: any) => (l ? { ...l, count: Math.max(0, l.count - 1), items: l.items.filter((y: any) => y.username !== c.username) } : l));
    if (x.data.matched) { setMatch(c); loadMatches(); }
    loadInfo();
    return true;
  }
  const c = cards[0], left = info ? `${info.likesLeft} of ${info.likesPerDay} likes left today${info.plan === 'FREE' ? ' · Plus gives you more' : ''}` : undefined;
  return (
    <div className="mx-auto max-w-md">
      {!app && <><h1 className="text-2xl font-black">Connect</h1><p className="mb-4 text-sm text-muted">Likes are private. They are only revealed when you both like each other.</p></>}
      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">{TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`chip shrink-0 ${tab === k ? 'chip-on' : ''}`}>{l}</button>)}</div>
      <p role="alert" className="min-h-5 text-sm text-danger">{err}</p>

      {tab === 'discover' && (enabled === null ? <p className="text-muted">Loading…</p> : !enabled ? (
        <div className="card space-y-3 p-6 text-center"><i className="fa-solid fa-heart text-3xl text-brand-500" /><h2 className="font-bold">Turn on Connect</h2>
          <p className="text-sm text-soft">Opt in to meet people for dating or a serious relationship. You can switch it off any time in Settings. Following or liking a post never counts as romantic interest.</p>
          <select aria-label="I am looking for" value={intent} onChange={(e) => setIntent(e.target.value)} className="inp"><option>Friends</option><option>Dating</option><option>Marriage</option></select>
          <button className="btn w-full" disabled={busy} onClick={enable}>Turn on</button></div>
      ) : !c ? <div className="card p-8 text-center text-soft">You&apos;ve seen everyone for now. Check back soon, or invite friends to join.</div>
        : app ? <SwipeDeck cards={cards} onAct={act} left={left} /> : (
        <div className="card p-5 text-center shadow-xl">
          <div className="flex justify-center"><Avatar src={c.avatarUrl} name={c.displayName} size={128} /></div>
          <h2 className="mt-3 text-xl font-black">{c.displayName}{c.verified && <i className="fa-solid fa-circle-check ml-1.5 text-sm text-brand-500" />}</h2>
          <p className="text-sm text-muted"><i className="fa-solid fa-location-dot" /> {c.area}{c.intent && <> · <span className="text-brand-500">{c.intent}</span></>}</p>
          {c.bio && <p className="mt-3 text-sm text-soft">{c.bio}</p>}
          {c.interests.length > 0 && <div className="mt-3 flex flex-wrap justify-center gap-1.5">{c.interests.map((i) => <span key={i} className={`chip ${c.common.includes(i) ? 'chip-on' : ''}`}>{i}</span>)}</div>}
          {c.common.length > 0 && <p className="mt-2 text-xs text-brand-500">{c.common.length} thing{c.common.length > 1 ? 's' : ''} in common</p>}
          <div className="mt-5 flex gap-3"><button className="btn-ghost flex-1" onClick={() => act(c, 'pass')}><i className="fa-solid fa-xmark mr-1.5" />Not now</button><button className="btn flex-1" onClick={() => act(c, 'like')}><i className="fa-solid fa-heart mr-1.5" />Like</button></div>
          {left && <p className="mt-3 text-xs text-muted">{left}</p>}
        </div>))}
      {tab === 'discover' && enabled && !app && (
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
