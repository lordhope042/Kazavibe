'use client';
import { useEffect } from 'react';
export default function PwaBoot() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const w = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const register = () => { void navigator.serviceWorker.register('/sw.js').catch(() => {}); };
    let timeout: number | undefined;
    let idle: number | undefined;
    if (w.requestIdleCallback) idle = w.requestIdleCallback(register, { timeout: 2500 });
    else timeout = window.setTimeout(register, 900);
    return () => {
      if (idle !== undefined) w.cancelIdleCallback?.(idle);
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, []);
  return null;
}
