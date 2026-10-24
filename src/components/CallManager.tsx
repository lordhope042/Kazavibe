'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import { api } from '@/lib/client';

type Party = { username: string; displayName: string; avatarUrl: string | null };
type Kind = 'AUDIO' | 'VIDEO';
type Active = { id: string; kind: Kind; caller: boolean; other: Party };
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Peer-to-peer calls (WebRTC). Our server only passes the setup messages; audio and video go straight between the two phones, or through a TURN relay if configured. */
export default function CallManager() {
  const [incoming, setIncoming] = useState<{ id: string; kind: Kind; from: Party } | null>(null);
  const [active, setActive] = useState<Active | null>(null), [status, setStatus] = useState(''), [live, setLive] = useState(false), [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false), [camOff, setCamOff] = useState(false), [notice, setNotice] = useState<React.ReactNode>(null);
  const activeRef = useRef<Active | null>(null); activeRef.current = active;
  const pc = useRef<RTCPeerConnection | null>(null), localStream = useRef<MediaStream | null>(null), remoteStream = useRef<MediaStream | null>(null);
  const lastSig = useRef(0), pendingIce = useRef<RTCIceCandidateInit[]>([]), poller = useRef<ReturnType<typeof setTimeout> | null>(null), ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopped = useRef(true), connected = useRef(false);
  const localEl = useRef<HTMLVideoElement>(null), remoteEl = useRef<HTMLVideoElement>(null), remoteAudio = useRef<HTMLAudioElement>(null);

  // keep the media elements attached to their streams
  useEffect(() => {
    const put = (el: HTMLMediaElement | null, s: MediaStream | null) => { if (el && s && el.srcObject !== s) el.srcObject = s; };
    put(localEl.current, localStream.current); put(remoteEl.current, remoteStream.current); put(remoteAudio.current, remoteStream.current);
  });
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 7000); return () => clearTimeout(t); }, [notice]);

  const cleanup = useCallback((msg?: React.ReactNode) => {
    stopped.current = true; connected.current = false;
    if (poller.current) clearTimeout(poller.current); if (ticker.current) clearInterval(ticker.current); poller.current = ticker.current = null;
    pc.current?.close(); pc.current = null;
    localStream.current?.getTracks().forEach((t) => t.stop()); localStream.current = null; remoteStream.current = null;
    lastSig.current = 0; pendingIce.current = [];
    setActive(null); setLive(false); setSecs(0); setMuted(false); setCamOff(false); setStatus('');
    if (msg) setNotice(msg);
  }, []);
  async function finish(msg?: React.ReactNode) { const c = activeRef.current; if (c) void api(`/api/calls/${c.id}`, 'POST', { action: 'end' }); cleanup(msg); }

  async function flushIce() { const conn = pc.current; if (!conn) return; for (const c of pendingIce.current.splice(0)) await conn.addIceCandidate(c).catch(() => {}); }
  async function handleSignal(s: { type: string; payload: any }) {
    const conn = pc.current, id = activeRef.current?.id; if (!conn || !id) return;
    if (s.type === 'offer') {
      await conn.setRemoteDescription(s.payload); await flushIce();
      const ans = await conn.createAnswer(); await conn.setLocalDescription(ans);
      await api(`/api/calls/${id}/signal`, 'POST', { type: 'answer', payload: { type: ans.type, sdp: ans.sdp } });
    } else if (s.type === 'answer') { await conn.setRemoteDescription(s.payload); await flushIce(); }
    else if (s.type === 'ice') { if (conn.remoteDescription) await conn.addIceCandidate(s.payload).catch(() => {}); else pendingIce.current.push(s.payload); }
  }
  function poll(call: Active) {
    if (stopped.current) return;
    poller.current = setTimeout(async () => {
      if (stopped.current) return;
      const x = await api<any>(`/api/calls/${call.id}?after=${lastSig.current}`);
      if (stopped.current) return;
      if (x.ok) {
        for (const s of x.data.signals) { lastSig.current = Math.max(lastSig.current, s.id); await handleSignal(s); }
        const st = x.data.status;
        if (st === 'RINGING' && call.caller) setStatus('Ringing…');
        if (st === 'ACTIVE' && !connected.current) setStatus('Connecting…');
        if (['DECLINED', 'MISSED', 'ENDED', 'CANCELED'].includes(st)) { cleanup(st === 'DECLINED' ? 'Call declined.' : st === 'MISSED' ? 'No answer.' : 'Call ended.'); return; }
      } else if (x.data && (x.data as any).error === 'Call not found') { cleanup('Call ended.'); return; }
      poll(call);
    }, connected.current ? 2000 : 700);
  }
  async function begin(call: Active) {
    stopped.current = false; connected.current = false; lastSig.current = 0; pendingIce.current = [];
    setActive(call); setStatus(call.caller ? 'Calling…' : 'Connecting…');
    try {
      const ice = await api<any>('/api/calls/ice');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: call.kind === 'VIDEO' ? { facingMode: 'user' } : false });
      localStream.current = stream;
      const conn = new RTCPeerConnection({ iceServers: ice.data.iceServers }); pc.current = conn;
      stream.getTracks().forEach((t) => conn.addTrack(t, stream));
      conn.ontrack = (e) => { const rs = remoteStream.current ?? (remoteStream.current = new MediaStream()); rs.addTrack(e.track); setStatus((s) => s + ''); };
      conn.onicecandidate = (e) => { if (e.candidate) void api(`/api/calls/${call.id}/signal`, 'POST', { type: 'ice', payload: e.candidate.toJSON() }); };
      conn.onconnectionstatechange = () => {
        const s = conn.connectionState;
        if (s === 'connected') { connected.current = true; setLive(true); setStatus('Connected'); if (!ticker.current) { const t0 = Date.now(); ticker.current = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 1000); } }
        else if (s === 'disconnected') setStatus('Reconnecting…');
        else if (s === 'failed') void finish('The call could not connect. Calls work best on Wi-Fi, or when the server has a relay (TURN) set up.');
      };
      if (call.caller) { const offer = await conn.createOffer(); await conn.setLocalDescription(offer); await api(`/api/calls/${call.id}/signal`, 'POST', { type: 'offer', payload: { type: offer.type, sdp: offer.sdp } }); }
      poll(call);
    } catch (e) {
      void finish(e instanceof DOMException && e.name === 'NotAllowedError' ? `Allow microphone${call.kind === 'VIDEO' ? ' and camera' : ''} access in your browser to make calls.` : 'Could not start the call on this device.');
    }
  }
  async function startOutgoing(d: Party & { kind: Kind }) {
    if (activeRef.current) return setNotice('You are already in a call.');
    const x = await api<any>('/api/calls', 'POST', { username: d.username, kind: d.kind });
    if (!x.ok) { const m = x.data.error ?? 'Could not start the call.'; return setNotice(m.includes('Plus') ? <>{m} <Link href="/plus" className="underline">Get Plus</Link></> : m); }
    void begin({ id: x.data.id, kind: d.kind, caller: true, other: { username: d.username, displayName: d.displayName, avatarUrl: d.avatarUrl } });
  }
  const startRef = useRef(startOutgoing); startRef.current = startOutgoing;
  useEffect(() => { const h = (e: Event) => startRef.current((e as CustomEvent).detail); window.addEventListener('kv:call', h); return () => window.removeEventListener('kv:call', h); }, []);
  // ring detection
  useEffect(() => {
    let on = true;
    const f = async () => { if (activeRef.current) return; const x = await api<any>('/api/calls/incoming'); if (on && x.ok) setIncoming(x.data.call); };
    f(); const t = setInterval(f, 3000);
    return () => { on = false; clearInterval(t); };
  }, []);
  // hang up if the tab is closed mid-call
  useEffect(() => {
    const h = () => { const c = activeRef.current; if (c) navigator.sendBeacon(`/api/calls/${c.id}`, new Blob([JSON.stringify({ action: 'end' })], { type: 'application/json' })); };
    window.addEventListener('pagehide', h); return () => window.removeEventListener('pagehide', h);
  }, []);

  async function accept() {
    const inc = incoming; if (!inc) return; setIncoming(null);
    const x = await api<any>(`/api/calls/${inc.id}`, 'POST', { action: 'accept' });
    if (!x.ok) return setNotice(x.data.error ?? 'That call has ended.');
    void begin({ id: inc.id, kind: inc.kind, caller: false, other: inc.from });
  }
  async function decline() { const inc = incoming; setIncoming(null); if (inc) await api(`/api/calls/${inc.id}`, 'POST', { action: 'decline' }); }
  const toggleMic = () => { localStream.current?.getAudioTracks().forEach((t) => (t.enabled = muted)); setMuted(!muted); };
  const toggleCam = () => { localStream.current?.getVideoTracks().forEach((t) => (t.enabled = camOff)); setCamOff(!camOff); };

  return (
    <>
      {notice && <div role="status" className="fixed inset-x-3 top-3 z-[97] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-sm shadow-2xl"><i className="fa-solid fa-phone text-brand-500" /><span className="flex-1">{notice}</span><button aria-label="Dismiss" onClick={() => setNotice(null)}><i className="fa-solid fa-xmark" /></button></div>}
      {incoming && !active && (
        <div role="alertdialog" aria-label="Incoming call" className="fixed inset-x-3 top-3 z-[96] mx-auto max-w-sm rounded-2xl border border-line bg-card p-4 shadow-2xl">
          <div className="flex items-center gap-3"><Avatar src={incoming.from.avatarUrl} name={incoming.from.displayName} size={48} /><div className="min-w-0 flex-1"><b className="block truncate">{incoming.from.displayName}</b><p className="text-xs text-muted">Incoming {incoming.kind === 'VIDEO' ? 'video' : 'voice'} call…</p></div></div>
          <div className="mt-3 flex gap-2"><button className="btn-ghost flex-1 !text-danger" onClick={decline}><i className="fa-solid fa-phone-slash mr-1.5" />Decline</button><button className="btn flex-1" onClick={accept}><i className="fa-solid fa-phone mr-1.5" />Accept</button></div>
        </div>)}
      {active && (
        <div role="dialog" aria-modal="true" aria-label="Call" className="fixed inset-0 z-[95] flex flex-col bg-black text-white">
          <div className="relative flex-1 overflow-hidden">
            {active.kind === 'VIDEO' ? <video ref={remoteEl} autoPlay playsInline className="h-full w-full object-cover" /> : <audio ref={remoteAudio} autoPlay />}
            {(active.kind === 'AUDIO' || !live) && <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-zinc-900 to-black"><div className="text-center"><div className="flex justify-center"><Avatar src={active.other.avatarUrl} name={active.other.displayName} size={112} /></div><h2 className="mt-4 text-2xl font-black">{active.other.displayName}</h2><p className="mt-1 text-sm text-white/70" role="status">{live ? fmt(secs) : status}</p></div></div>}
            {active.kind === 'VIDEO' && <video ref={localEl} autoPlay playsInline muted className="absolute right-3 top-3 h-36 w-24 rounded-xl border border-white/20 bg-black object-cover [transform:scaleX(-1)]" />}
            {active.kind === 'VIDEO' && live && <p className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-sm" role="timer">{fmt(secs)}</p>}
          </div>
          <div className="flex items-center justify-center gap-5 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <button onClick={toggleMic} aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted} className={`grid h-14 w-14 place-items-center rounded-full ${muted ? 'bg-white text-black' : 'bg-white/15'}`}><i className={`fa-solid ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`} /></button>
            {active.kind === 'VIDEO' && <button onClick={toggleCam} aria-label={camOff ? 'Turn camera on' : 'Turn camera off'} aria-pressed={camOff} className={`grid h-14 w-14 place-items-center rounded-full ${camOff ? 'bg-white text-black' : 'bg-white/15'}`}><i className={`fa-solid ${camOff ? 'fa-video-slash' : 'fa-video'}`} /></button>}
            <button onClick={() => finish('Call ended.')} aria-label="End call" className="grid h-14 w-14 place-items-center rounded-full bg-red-600"><i className="fa-solid fa-phone-slash" /></button>
          </div>
        </div>)}
    </>
  );
}
