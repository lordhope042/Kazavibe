'use client';
import { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { EN, HA, type Lang } from '@/lib/i18n';

const Ctx = createContext<Lang>('en');
export const LangProvider = ({ lang, children }: { lang: Lang; children: React.ReactNode }) => <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
export const useLang = () => useContext(Ctx);
export function useT() {
  const l = useContext(Ctx);
  return (k: string) => (l === 'ha' ? (HA as Record<string, string>)[k] : undefined) ?? (EN as Record<string, string>)[k] ?? k;
}
export function LangSwitch({ className = '' }: { className?: string }) {
  const l = useLang(), r = useRouter();
  const set = (v: string) => { document.cookie = `kv-lang=${v};path=/;max-age=31536000;samesite=lax`; r.refresh(); };
  return (
    <select aria-label="Language / Harshe" value={l} onChange={(e) => set(e.target.value)} className={`rounded-lg border border-line bg-card px-2 py-1 text-xs text-fg ${className}`}>
      <option value="en">English</option><option value="ha">Hausa</option>
    </select>
  );
}
