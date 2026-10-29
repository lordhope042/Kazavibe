'use client';
import { postUpload } from '@/lib/upload';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import VoicePlayer from './VoicePlayer';
import { api, ago } from '@/lib/client';

type Status = 'sent' | 'delivered' | 'read';
type Kind = 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE' | 'FILE' | 'DELETED';
type Msg = { id: string; mine: boolean; kind: Kind; body: string; url: string | null; fileName: string | null; durationSec: number | null; createdAt: string; status: Status; pinned: boolean };
type Conv = { id: string; accepted: boolean; isRequest: boolean; pinned: boolean; archived: boolean; username: string; displayName: string; avatarUrl: string | null; last: string; lastAt: string | null; lastMine: boolean; lastStatus: Status; unread: number };
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const hhmm = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dayLabel = (d: string) => { const x = new Date(d), n = new Date(), y = new Date(Date.now() - 864e5); return x.toDateString() === n.toDateString() ? 'Today' : x.toDateString() === y.toDateString() ? 'Yesterday' : x.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
const ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
const GONE = { kind: 'DELETED' as Kind, body: '', url: null, fileName: null, durationSec: null, pinned: false };

/** sent = one grey tick, delivered = two grey ticks, read = two blue ticks. */
function Ticks({ s }: { s: Status }) {
  return <i role="img" aria-label={s === 'read' ? 'Read' : s === 'delivered' ? 'Delivered' : 'Sent'} className={`fa-solid ${s === 'sent' ? 'fa-check' : 'fa-check-double'} text-[11px] ${s === 'read' ? 'text-sky-500' : 'text-muted'}`} />;
}
/** Press-and-hold on touch screens, right-click on desktop. */
function useLongPress(cb: () => void) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => { if (t.current) { clearTimeout(t.current); t.current = null; } };
  return { onTouchStart: () => { clear(); t.current = setTimeout(cb, 450); }, onTouchEnd: clear, onTouchMove: clear, onTouchCancel: clear, onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); cb(); } };
}
function Sheet({ onClose, title, children }: { onClose: () => void; title?: string; children: React.ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-black/50 sm:place-items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={title ?? 'Options'}>
      <div className="card w-full max-w-xs overflow-hidden rounded-b-none pb-[env(safe-area-inset-bottom)] sm:rounded-b-3xl" onClick={(e) => e.stopPropagation()}>{title && <p className="truncate border-b border-line px-5 py-3 text-xs font-semibold text-muted">{title}</p>}{children}</div>
    </div>
  );
}
const Row = ({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) => (
  <button onClick={onClick} className={`flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm hover:bg-hover ${danger ? 'text-danger' : ''}`}><i className={`fa-solid ${icon} w-5 text-center`} />{label}</button>
);

function Content({ m }: { m: Msg }) {
  if (m.kind === 'DELETED') return <p className="italic text-muted"><i className="fa-solid fa-ban mr-1.5 text-xs" />{m.mine ? 'You deleted this message' : 'This message was deleted'}</p>;
  if (m.kind === 'IMAGE') return <a href={m.url!} target="_blank" rel="noreferrer" className="block"><img src={m.url!} alt="Photo" loading="lazy" className="max-h-64 rounded-xl object-cover" /></a>;
  if (m.kind === 'VIDEO') return <video src={m.url!} controls playsInline preload="metadata" className="max-h-64 rounded-xl bg-black" />;
  if (m.kind === 'VOICE') return <VoicePlayer src={m.url!} duration={m.durationSec} />;
  if (m.kind === 'FILE') return <a href={m.url!} download={m.fileName ?? undefined} className="flex items-center gap-2.5 py-1"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600/15 text-brand-500"><i className="fa-solid fa-file-lines" /></span><span className="min-w-0 flex-1 truncate font-medium">{m.fileName ?? 'File'}</span><i className="fa-solid fa-download text-xs text-muted" /></a>;
  return <p className="whitespace-pre-wrap break-words">{m.body}</p>;
}
function Bubble({ m, onMenu }: { m: Msg; onMenu: (m: Msg) => void }) {
  const lp = useLongPress(() => onMenu(m));
  return (
    <div id={`m-${m.id}`} className={`group flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
      <div {...lp} className={`relative max-w-[82%] rounded-2xl px-3 pb-1 pt-1.5 text-sm ${m.mine ? 'rounded-br-md border border-brand-600/30 bg-brand-600/15' : 'rounded-bl-md bg-input'}`}>
        <Content m={m} />
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-muted">{m.pinned && <i className="fa-solid fa-thumbtack text-brand-500" aria-label="Pinned" />}<span>{hhmm(m.createdAt)}</span>{m.mine && m.kind !== 'DELETED' && <Ticks s={m.status} />}</div>
        <button aria-label="Message options" onClick={() => onMenu(m)} className="absolute right-1 top-1 hidden h-5 w-5 place-items-center rounded-full bg-card/90 text-[10px] text-muted shadow focus:grid group-hover:grid"><i className="fa-solid fa-chevron-down" /></button>
      </div>
    </div>
  );
}
function ChatRow({ c, active, onOpen, onMenu }: { c: Conv; active: boolean; onOpen: () => void; onMenu: () => void }) {
  const lp = useLongPress(onMenu);
  return (
    <li className="group relative">
      <button {...lp} onClick={onOpen} className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-hover ${active ? 'bg-hover' : ''}`}>
        <Avatar src={c.avatarUrl} name={c.displayName} size={46} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><b className="truncate text-sm">{c.displayName}</b><span className={`text-[11px] ${c.unread ? 'font-bold text-brand-500' : 'text-muted'}`}>{c.lastAt && ago(c.lastAt)}</span></div>
          <div className="flex items-center gap-1 text-xs text-muted">{c.lastMine && c.last && <Ticks s={c.lastStatus} />}<p className="min-w-0 flex-1 truncate">{c.last || 'No messages yet'}</p>{c.pinned && <i className="fa-solid fa-thumbtack" aria-label="Pinned chat" />}{c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{c.unread}</span>}</div>
        </div>
      </button>
      <button aria-label={`Options for ${c.displayName}`} onClick={onMenu} className="absolute right-2 top-2 hidden h-6 w-6 place-items-center rounded-full bg-card text-[10px] text-muted shadow focus:grid group-hover:grid"><i className="fa-solid fa-chevron-down" /></button>
    </li>
  );
}

export default function MessagesClient({ startWith }: { startWith?: string }) {
  const [convs, setConvs] = useState<Conv[] | null>(null), [tab, setTab] = useState<'all' | 'req' | 'arch'>('all'), [cur, setCur] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null), [msgs, setMsgs] = useState<Msg[]>([]), [pins, setPins] = useState<{ id: string; text: string }[]>([]);
  const [text, setText] = useState(''), [err, setErr] = useState(''), [info, setInfo] = useState(''), [note, setNote] = useState(''), [listErr, setListErr] = useState('');
  const [plan, setPlan] = useState<'FREE' | 'PLUS'>('FREE'), [rec, setRec] = useState<{ sec: number } | null>(null);
  const [menu, setMenu] = useState<{ m: Msg; confirm?: 'me' | 'all' } | null>(null), [chatMenu, setChatMenu] = useState<Conv | null>(null);
  const end = useRef<HTMLDivElement>(null), last = useRef<string | undefined>(undefined), pollRef = useRef<() => void>();
  const curRef = useRef<string | null>(null); curRef.current = cur;
  const recorder = useRef<MediaRecorder | null>(null), chunks = useRef<Blob[]>([]), timer = useRef<ReturnType<typeof setInterval> | null>(null), cancelled = useRef(false), secs = useRef(0);

  const loadList = useCallback(async () => { const x = await api<Conv[]>('/api/conversations'); if (x.ok) setConvs(x.data); }, []);
  useEffect(() => { loadList(); const t = setInterval(() => { if (!document.hidden) loadList(); }, 8000); api<any>('/api/plan').then((x) => x.ok && setPlan(x.data.plan)); return () => clearInterval(t); }, [loadList]);
  useEffect(() => { if (startWith) api<{ id: string }>('/api/conversations', 'POST', { username: startWith }).then((x) => { if (x.ok) { setCur(x.data.id); loadList(); } else setErr((x.data as any).error ?? ''); }); }, [startWith, loadList]);
  useEffect(() => {
    if (!cur) return;
    let on = true; last.current = undefined; setMsgs([]); setMeta(null); setPins([]); setErr(''); setNote(''); setInfo('');
    const poll = async () => {
      const x = await api<{ conv: any; messages: Msg[]; updates: { id: string; status: Status; deleted: boolean; pinned: boolean }[]; pins: { id: string; text: string }[] }>(`/api/conversations/${cur}/messages${last.current ? `?after=${encodeURIComponent(last.current)}` : ''}`);
      if (!on || !x.ok) return;
      setMeta(x.data.conv); setPins(x.data.pins);
      const upd = new Map(x.data.updates.map((u) => [u.id, u]));
      setMsgs((m) => {
        const ids = new Set(m.map((y) => y.id)); let changed = false;
        let next = m.map((y) => {
          const u = upd.get(y.id); if (!u) return y;
          const status = y.mine ? u.status : y.status;
          if (status === y.status && u.pinned === y.pinned && (u.deleted === (y.kind === 'DELETED'))) return y;
          changed = true; return { ...y, status, pinned: u.pinned, ...(u.deleted ? GONE : {}) };
        });
        const fresh = x.data.messages.filter((y) => !ids.has(y.id));
        if (fresh.length) { last.current = fresh[fresh.length - 1].createdAt; next = [...next, ...fresh]; changed = true; }
        else if (!last.current && x.data.messages.length) last.current = x.data.messages[x.data.messages.length - 1].createdAt;
        return changed ? next : m;
      });
    };
    pollRef.current = poll; poll(); const t = setInterval(() => { if (!document.hidden) poll(); }, 3000);
    return () => { on = false; clearInterval(t); cancelled.current = true; if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop(); };
  }, [cur]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault(); if (!text.trim() || !cur) return; setErr('');
    const x = await api<any>(`/api/conversations/${cur}/messages`, 'POST', { body: text });
    if (!x.ok) return setErr(x.data.error ?? 'Could not send.');
    setMsgs((m) => [...m, x.data]); last.current = x.data.createdAt; setText(''); loadList();
  }
  async function sendFile(file: File, kind: 'file' | 'voice', dur?: number) {
    const id = curRef.current; if (!id) return; setErr('');
    if (file.size > 50 * 1024 * 1024) return setErr('File is too large (50 MB maximum).');
    const { ok, data: d } = await postUpload(`/api/conversations/${id}/attachments`, file, kind === 'voice' ? 'voice' : 'chat', { kind, durationSec: dur, fileName: file.name });
    if (!ok) return setErr(d.error ?? 'Could not send.');
    setMsgs((m) => [...m, d]); last.current = d.createdAt; loadList();
  }
  async function startRec() {
    setErr(''); setNote('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = []; cancelled.current = false; secs.current = 0;
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop()); if (timer.current) clearInterval(timer.current); setRec(null);
        if (cancelled.current) return;
        const type = r.mimeType || 'audio/webm', blob = new Blob(chunks.current, { type });
        if (blob.size < 1000) return setErr('That recording was too short.');
        sendFile(new File([blob], `voice.${type.includes('mp4') ? 'm4a' : 'webm'}`, { type }), 'voice', secs.current);
      };
      recorder.current = r; r.start(); setRec({ sec: 0 });
      timer.current = setInterval(() => { secs.current += 1; setRec({ sec: secs.current }); if (secs.current >= 120 && r.state !== 'inactive') r.stop(); }, 1000);
    } catch { setErr('Allow microphone access to record voice notes.'); }
  }
  function stopRec(sendIt: boolean) { cancelled.current = !sendIt; if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop(); }
  function call(kind: 'Voice' | 'Video') {
    if (plan !== 'PLUS') return setNote(`${kind} calls are a Plus feature. You can get Plus from your account menu.`);
    if (!meta?.accepted) return setNote('You can call once the message request is accepted.');
    setNote('');
    window.dispatchEvent(new CustomEvent('kv:call', { detail: { username: meta.username, displayName: meta.displayName, avatarUrl: meta.avatarUrl, kind: kind === 'Voice' ? 'AUDIO' : 'VIDEO' } }));
  }

  async function msgAction(m: Msg, action: 'delete_me' | 'delete_all' | 'pin' | 'unpin') {
    setMenu(null); setErr('');
    const x = await api<any>(`/api/messages/${m.id}`, 'POST', { action });
    if (!x.ok) return setErr(x.data.error ?? 'Could not do that.');
    if (action === 'delete_me') setMsgs((l) => l.filter((y) => y.id !== m.id));
    else if (action === 'delete_all') setMsgs((l) => l.map((y) => (y.id === m.id ? { ...y, ...GONE } : y)));
    else setMsgs((l) => l.map((y) => (y.id === m.id ? { ...y, pinned: action === 'pin' } : y)));
    pollRef.current?.(); loadList();
  }
  async function convAction(c: Conv, action: 'pin' | 'unpin' | 'archive' | 'unarchive') {
    setChatMenu(null); setListErr('');
    const x = await api<any>(`/api/conversations/${c.id}`, 'POST', { action });
    if (!x.ok) return setListErr(x.data.error ?? 'Could not do that.');
    if (action === 'archive' && cur === c.id) setCur(null);
    loadList();
  }
  async function act(action: 'accept' | 'decline') { await api(`/api/conversations/${cur}`, 'POST', { action }); if (action === 'decline') setCur(null); else setMeta({ ...meta, accepted: true, isRequest: false }); loadList(); }
  async function block() { if (confirm('Block this member?') && (await api('/api/blocks', 'POST', { username: meta.username })).ok) { setCur(null); loadList(); } }
  async function report() { const x = await api('/api/reports', 'POST', { username: meta.username, category: 'HARASSMENT' }); setErr(x.ok ? '' : 'Could not send report.'); setInfo(x.ok ? 'Report sent. Thank you.' : ''); }
  async function copy(m: Msg) { setMenu(null); try { await navigator.clipboard.writeText(m.body); setInfo('Copied'); setTimeout(() => setInfo(''), 1500); } catch { setErr('Could not copy.'); } }

  const all = convs ?? [];
  const list = all.filter((c) => (tab === 'arch' ? c.archived : tab === 'req' ? !c.archived && c.isRequest : !c.archived && !c.isRequest))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.lastAt ?? 0).getTime() - new Date(a.lastAt ?? 0).getTime());
  const reqCount = all.filter((c) => !c.archived && c.isRequest).length, archCount = all.filter((c) => c.archived).length;
  const canRecord = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';
  const canDeleteAll = (m: Msg) => m.mine && m.kind !== 'DELETED' && Date.now() - new Date(m.createdAt).getTime() < 48 * 3600e3;
  const jumpToPin = () => { const el = pins[0] && document.getElementById(`m-${pins[0].id}`); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); };

  return (
    <div className="card mx-auto grid h-[calc(100dvh-9rem)] max-w-5xl overflow-hidden sm:h-[calc(100dvh-8rem)] md:grid-cols-[340px_1fr]">
      <aside className={`${cur ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-r border-line`}>
        <div className="p-4 pb-2"><h1 className="text-lg font-black">Messages</h1>
          <div className="mt-2 flex flex-wrap gap-2"><button className={`chip ${tab === 'all' ? 'chip-on' : ''}`} onClick={() => setTab('all')}>All</button><button className={`chip ${tab === 'req' ? 'chip-on' : ''}`} onClick={() => setTab('req')}>Requests{reqCount > 0 && ` (${reqCount})`}</button><button className={`chip ${tab === 'arch' ? 'chip-on' : ''}`} onClick={() => setTab('arch')}><i className="fa-solid fa-box-archive mr-1" />Archived{archCount > 0 && ` (${archCount})`}</button></div>
          <p role="alert" className="mt-1 min-h-4 text-xs text-danger">{listErr}</p></div>
        <ul className="flex-1 overflow-y-auto">
          {convs === null ? <li className="p-4 text-sm text-muted">Loading…</li> : list.length === 0 ? <li className="p-4 text-sm text-muted">{tab === 'req' ? 'No message requests.' : tab === 'arch' ? 'No archived chats. Press and hold a chat to archive it.' : 'No conversations yet. Visit a profile and tap Message.'}</li> :
            list.map((c) => <ChatRow key={c.id} c={c} active={cur === c.id} onOpen={() => setCur(c.id)} onMenu={() => setChatMenu(c)} />)}
        </ul>
      </aside>

      <section className={`${cur ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-col`}>
        {!cur || !meta ? <div className="grid flex-1 place-items-center p-6 text-center text-muted">{cur ? 'Loading…' : 'Select a conversation'}</div> : <>
          <div className="flex items-center gap-2 border-b border-line p-3">
            <button className="md:hidden" aria-label="Back" onClick={() => setCur(null)}><i className="fa-solid fa-chevron-left" /></button>
            <Avatar src={meta.avatarUrl} name={meta.displayName} size={36} /><Link href={`/profile/${meta.username}`} className="flex-1 truncate text-sm font-bold">{meta.displayName}</Link>
            <button className="btn-ghost btn-sm" aria-label="Voice call (Plus feature)" title="Voice call (Plus)" onClick={() => call('Voice')}><i className="fa-solid fa-phone" /></button>
            <button className="btn-ghost btn-sm" aria-label="Video call (Plus feature)" title="Video call (Plus)" onClick={() => call('Video')}><i className="fa-solid fa-video" /></button>
            <button className="btn-ghost btn-sm" onClick={report}>Report</button><button className="btn-ghost btn-sm" onClick={block}>Block</button>
          </div>
          {pins.length > 0 && <button onClick={jumpToPin} className="flex w-full items-center gap-2 border-b border-line bg-card px-4 py-2 text-left text-xs text-soft hover:bg-hover"><i className="fa-solid fa-thumbtack text-brand-500" /><span className="min-w-0 flex-1 truncate">{pins[0].text}</span>{pins.length > 1 && <span className="text-muted">{pins.length} pinned</span>}</button>}
          {note && <p role="status" className="border-b border-line bg-brand-600/10 px-4 py-2 text-xs text-brand-500"><i className="fa-solid fa-crown mr-1.5" />{note}</p>}
          <div className="flex-1 space-y-1.5 overflow-y-auto bg-hover/30 p-4" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={m.id}>
                {(i === 0 || new Date(m.createdAt).toDateString() !== new Date(msgs[i - 1].createdAt).toDateString()) && <p className="my-2 text-center"><span className="rounded-full bg-card px-3 py-1 text-[11px] font-semibold text-muted shadow-sm">{dayLabel(m.createdAt)}</span></p>}
                <Bubble m={m} onMenu={(x) => setMenu({ m: x })} />
              </div>))}
            <div ref={end} />
          </div>
          {meta.isRequest ? <div className="border-t border-line p-4 text-center text-sm"><p className="mb-2 text-soft">{meta.displayName} wants to message you. Accepting lets you reply.</p><div className="flex justify-center gap-2"><button className="btn btn-sm" onClick={() => act('accept')}>Accept</button><button className="btn-ghost btn-sm" onClick={() => act('decline')}>Delete</button><button className="btn-ghost btn-sm" onClick={block}>Block</button></div></div> : (
            <div className="border-t border-line p-3">
              {rec ? (
                <div className="flex items-center gap-3"><span className="kv-pulse h-3 w-3 rounded-full bg-danger" aria-hidden="true" /><span className="flex-1 text-sm font-semibold" role="timer">Recording {fmt(rec.sec)}</span>
                  <button className="btn-ghost btn-sm" onClick={() => stopRec(false)}><i className="fa-regular fa-trash-can mr-1" />Cancel</button><button className="btn btn-sm" onClick={() => stopRec(true)}><i className="fa-solid fa-paper-plane mr-1" />Send</button></div>
              ) : (
                <form onSubmit={send} className="flex items-center gap-2">
                  <label className="btn-ghost cursor-pointer !px-3" title="Attach a file" aria-label="Attach a file"><i className="fa-solid fa-paperclip" /><input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) sendFile(f, 'file'); }} /></label>
                  <input className="inp" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={!meta.accepted ? 'Send a message request…' : 'Type a message…'} aria-label="Message" />
                  {canRecord && !text.trim() ? <button type="button" className="btn" aria-label="Record a voice note" onClick={startRec}><i className="fa-solid fa-microphone" /></button> : <button className="btn" aria-label="Send"><i className="fa-solid fa-paper-plane" /></button>}
                </form>)}
              <p role="alert" className="mt-1 min-h-4 text-xs text-danger">{err}</p><p role="status" className="text-xs text-good">{info}</p>
            </div>)}
        </>}
      </section>

      {menu && (
        <Sheet onClose={() => setMenu(null)} title={menu.confirm ? undefined : 'Message options'}>
          {menu.confirm ? (
            <div className="space-y-4 p-5"><p className="text-sm">{menu.confirm === 'all' ? 'Delete this message for everyone? They will see that it was deleted.' : 'Delete this message for you? The other person will still see it.'}</p>
              <div className="flex gap-2"><button className="btn-ghost flex-1" onClick={() => setMenu({ m: menu.m })}>Cancel</button><button className="btn flex-1" onClick={() => msgAction(menu.m, menu.confirm === 'all' ? 'delete_all' : 'delete_me')}>Delete</button></div></div>
          ) : <>
            {menu.m.kind === 'TEXT' && <Row icon="fa-copy" label="Copy" onClick={() => copy(menu.m)} />}
            {menu.m.kind !== 'DELETED' && <Row icon="fa-thumbtack" label={menu.m.pinned ? 'Unpin message' : 'Pin message'} onClick={() => msgAction(menu.m, menu.m.pinned ? 'unpin' : 'pin')} />}
            <Row icon="fa-trash-can" label="Delete for me" danger onClick={() => setMenu({ m: menu.m, confirm: 'me' })} />
            {canDeleteAll(menu.m) && <Row icon="fa-trash" label="Delete for everyone" danger onClick={() => setMenu({ m: menu.m, confirm: 'all' })} />}
          </>}
        </Sheet>)}
      {chatMenu && (
        <Sheet onClose={() => setChatMenu(null)} title={chatMenu.displayName}>
          {!chatMenu.archived && <Row icon="fa-thumbtack" label={chatMenu.pinned ? 'Unpin chat' : 'Pin chat'} onClick={() => convAction(chatMenu, chatMenu.pinned ? 'unpin' : 'pin')} />}
          <Row icon="fa-box-archive" label={chatMenu.archived ? 'Unarchive chat' : 'Archive chat'} onClick={() => convAction(chatMenu, chatMenu.archived ? 'unarchive' : 'archive')} />
        </Sheet>)}
    </div>
  );
}
