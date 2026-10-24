'use client';
import { useState } from 'react';
export default function Avatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  const [bad, setBad] = useState(false); // a hidden/unavailable photo falls back to the initial
  const st = { width: size, height: size };
  return src && !bad
    ? <img src={src} alt="" style={st} onError={() => setBad(true)} className="shrink-0 rounded-full border border-brand-600/60 object-cover" />
    : <span style={{ ...st, fontSize: size * 0.4 }} className="grid shrink-0 place-items-center rounded-full bg-gradient-to-tr from-brand-600 to-amber-500 font-bold text-white" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>;
}
