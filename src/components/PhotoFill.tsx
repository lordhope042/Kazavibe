'use client';
import { useState } from 'react';
/** Fills its box with a profile photo, or a coloured tile with the initial if there is no photo (or it is hidden). */
export default function PhotoFill({ src, name, className = '' }: { src?: string | null; name: string; className?: string }) {
  const [bad, setBad] = useState(false);
  return src && !bad
    ? <img src={src} alt="" onError={() => setBad(true)} className={`h-full w-full object-cover ${className}`} />
    : <div aria-hidden="true" className={`grid h-full w-full place-items-center bg-gradient-to-br from-brand-600 to-amber-500 text-6xl font-black text-white ${className}`}>{name.slice(0, 1).toUpperCase()}</div>;
}
