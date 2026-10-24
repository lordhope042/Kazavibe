'use client';
import Link from 'next/link';
import Logo from './Logo';
import { LangSwitch, useT } from './LangProvider';

const COLS: [string, [string, string][]][] = [
  ['company', [['/about', 'about'], ['/safety', 'safety_centre'], ['/guidelines', 'guidelines']]],
  ['legal', [['/privacy', 'privacy'], ['/terms', 'terms']]],
  ['support', [['/help', 'help'], ['/login', 'log_in'], ['/register', 'create_account']]],
];
const SHORT: [string, string][] = [['/about', 'short_about'], ['/safety', 'short_safety'], ['/guidelines', 'short_guidelines'], ['/privacy', 'short_privacy'], ['/terms', 'short_terms'], ['/help', 'short_help']];
const year = new Date().getFullYear();

export default function Footer({ compact = false }: { compact?: boolean }) {
  const t = useT();
  if (compact) return (
    <footer className="hidden border-t border-line px-4 py-4 text-xs text-muted sm:block">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <span>© {year} KazaVibe · Kazaure, Jigawa State</span>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-1">{SHORT.map(([h, k]) => <Link key={h} href={h} className="hover:text-fg">{t(k)}</Link>)}<LangSwitch /></nav>
      </div>
    </footer>
  );
  return (
    <footer className="mt-8 border-t border-line bg-card/50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="space-y-3"><Logo size={28} /><p className="text-sm text-soft">{t('tagline')}</p><p className="text-xs text-muted"><i className="fa-solid fa-location-dot mr-1.5 text-brand-500" />{t('made_in')}</p></div>
        {COLS.map(([title, links]) => (
          <nav key={title} aria-label={t(title)}><h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">{t(title)}</h2>
            <ul className="space-y-2 text-sm">{links.map(([h, k]) => <li key={h}><Link href={h} className="text-soft transition hover:text-brand-500">{t(k)}</Link></li>)}</ul></nav>))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-line px-4 py-4 text-center text-xs text-muted"><p>© {year} KazaVibe. {t('footer_note')}</p><LangSwitch /></div>
    </footer>
  );
}
