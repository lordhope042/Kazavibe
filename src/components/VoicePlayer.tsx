'use client';
import { useMemo, useRef, useState } from 'react';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
// Deterministic "waveform" from the file name, so each voice note looks different but stays stable.
function bars(seed: string, n = 30) {
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return Array.from({ length: n }, () => { h = (h * 1664525 + 1013904223) >>> 0; return 6 + ((h >>> 24) % 18); });
}

export default function VoicePlayer({ src, duration }: { src: string; duration: number | null }) {
  const a = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false), [t, setT] = useState(0), [dur, setDur] = useState(duration ?? 0), [rate, setRate] = useState(1);
  const hs = useMemo(() => bars(src), [src]);
  const progress = dur > 0 ? Math.min(1, t / dur) : 0;
  const toggle = () => { const el = a.current; if (!el) return; if (el.paused) el.play().catch(() => {}); else el.pause(); };
  const seekTo = (sec: number) => { const el = a.current; if (el && dur > 0) { el.currentTime = Math.max(0, Math.min(dur, sec)); setT(el.currentTime); } };
  const cycle = () => { const nx = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1; setRate(nx); if (a.current) a.current.playbackRate = nx; };
  return (
    <div className="flex w-60 max-w-full items-center gap-2.5 py-0.5">
      <button onClick={toggle} aria-label={playing ? 'Pause voice note' : 'Play voice note'} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-brand-600 to-amber-500 text-white shadow">
        <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play ml-0.5'} text-sm`} />
      </button>
      <div className="min-w-0 flex-1">
        <div role="slider" tabIndex={0} aria-label="Seek voice note" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(t)} className="flex h-6 cursor-pointer items-center gap-[2px]"
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * dur); }}
          onKeyDown={(e) => { if (e.key === 'ArrowRight') seekTo(t + 5); if (e.key === 'ArrowLeft') seekTo(t - 5); if (e.key === ' ') { e.preventDefault(); toggle(); } }}>
          {hs.map((h, i) => <span key={i} style={{ height: h }} className={`w-[3px] rounded-full ${i / hs.length < progress ? 'bg-brand-600' : 'bg-muted/50'}`} />)}
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted"><span>{fmt(playing || t > 0 ? t : dur)}</span><button onClick={cycle} aria-label={`Playback speed ${rate}x`} className="rounded-md bg-input px-1.5 font-semibold">{rate}x</button></div>
      </div>
      <audio ref={a} src={src} preload="metadata" className="hidden"
        onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (isFinite(d) && d > 0) setDur(d); }} // recordings from some browsers report no length, so we keep the saved one
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setT(0); }} />
    </div>
  );
}
