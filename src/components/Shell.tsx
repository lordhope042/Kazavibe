'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import Avatar from './Avatar';
import CreatePost from './CreatePost';
import Footer from './Footer';
import CallManager from './CallManager';
import InstallBanner from './InstallBanner';
import { LangSwitch, useT } from './LangProvider';
import { api } from '@/lib/client';
import { tap } from '@/lib/haptic';

type Me = { username: string; displayName: string; avatarUrl: string | null; staff: boolean };
const NAV = [['/home', 'nav_home', 'fa-house'], ['/clips', 'nav_clips', 'fa-film'], ['/discover', 'nav_discover', 'fa-compass'], ['/connect', 'nav_connect', 'fa-heart'], ['/nearby', 'nav_nearby', 'fa-location-arrow'], ['/messages', 'nav_messages', 'fa-comments']];
const ROOTS = NAV.map((n) => n[0]); // top-level screens: no back arrow
const TITLES: [string, string][] = [...NAV.map((n): [string, string] => [n[0], n[1]]), ['/notifications', 'notifications'], ['/settings', 'settings'], ['/plus', 'plus'], ['/billing', 'plus'], ['/verification', 'verification'], ['/admin', 'nav_dashboard'], ['/profile', 'profile']];
const BOTTOM = [NAV[0], NAV[1], null, NAV[3], NAV[5]];

export default function Shell({ me, children }: { me: Me; children: React.ReactNode }) {
  const path = usePathname(), r = useRouter(), t = useT();
  const [unread, setUnread] = useState(0), [msgUnread, setMsgUnread] = useState(0), [post, setPost] = useState(false), [q, setQ] = useState('');
  useEffect(() => {
    let on = true;
    const f = async () => { if (document.hidden) return; const x = await api('/api/notifications?count=1'); if (on && x.ok) { setUnread(x.data.unread); setMsgUnread(x.data.unreadMessages ?? 0); } };
    f(); const timer = setInterval(f, 30000);
    const open = () => setPost(true);
    window.addEventListener('kv:compose', open);
    return () => { on = false; clearInterval(timer); window.removeEventListener('kv:compose', open); };
  }, [path]);
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); r.push('/'); r.refresh(); }
  const on = (h: string) => path.startsWith(h);
  const isRoot = ROOTS.includes(path), titleKey = TITLES.find(([p]) => path === p || path.startsWith(p + '/'))?.[1];
  const badge = (n: number, cls: string) => n > 0 && <b className={`rounded-full bg-brand-600 text-white ${cls}`}>{n > 99 ? '99+' : n}</b>;
  return (
    <>
      <header className="kv-header kv-chrome sticky top-0 z-40 border-b border-line bg-card/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:px-4">
          {isRoot
            ? <Link href="/home" aria-label="KazaVibe home" className="sm:hidden"><Logo size={30} markOnly /></Link>
            : <button aria-label="Back" onClick={() => r.back()} className="-ml-1 grid h-10 w-10 place-items-center rounded-full text-lg hover:bg-hover sm:hidden"><i className="fa-solid fa-chevron-left" /></button>}
          <div className="truncate text-lg font-black sm:hidden">{titleKey ? t(titleKey) : 'KazaVibe'}</div>
          <Link href="/home" aria-label="KazaVibe home" className="hidden sm:block"><Logo size={30} /></Link>
          <form className="ml-3 hidden w-64 items-center rounded-full border border-line bg-bg px-3.5 py-1.5 focus-within:border-brand-600 md:flex lg:w-80" onSubmit={(e) => { e.preventDefault(); r.push(`/discover?q=${encodeURIComponent(q)}`); }}>
            <i className="fa-solid fa-magnifying-glass mr-2.5 text-sm text-muted" />
            <input aria-label="Search people" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search_people')} className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
          </form>
          <nav className="mx-auto hidden items-center gap-1 rounded-full border border-line bg-bg/60 p-1 lg:flex" aria-label="Main">
            {NAV.map(([h, l]) => <Link key={h} href={h} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${on(h) ? 'bg-brand-600/10 text-brand-500' : 'text-muted hover:text-fg'}`}>{t(l)}{h === '/messages' && badge(msgUnread, 'ml-1.5 px-1.5 text-[10px]')}</Link>)}
            {me.staff && <Link href="/admin" className={`rounded-full px-4 py-1.5 text-xs font-semibold ${on('/admin') ? 'bg-brand-600/10 text-brand-500' : 'text-muted hover:text-fg'}`}>{t('nav_dashboard')}</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
            <Link href="/discover" aria-label="Search people" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-hover hover:text-fg md:hidden"><i className="fa-solid fa-magnifying-glass text-lg" /></Link>
            <button onClick={() => setPost(true)} className="btn btn-sm hidden sm:block"><i className="fa-solid fa-plus mr-1" />{t('btn_post')}</button>
            <Link href="/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-hover hover:text-fg">
              <i className="fa-regular fa-bell text-lg" />{badge(unread, 'absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center px-1 text-[10px]')}
            </Link>
            <details className="relative" key={path}>
              <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center" aria-label="Account menu"><Avatar src={me.avatarUrl} name={me.displayName} size={32} /></summary>
              <div className="card absolute right-0 mt-2 w-52 space-y-1 p-2 text-sm shadow-xl">
                <Link className="block rounded-xl px-3 py-2.5 hover:bg-hover" href={`/profile/${me.username}`}>{t('my_profile')}</Link>
                <Link className="block rounded-xl px-3 py-2.5 hover:bg-hover" href="/plus"><i className="fa-solid fa-crown mr-2 text-brand-500" />KazaVibe Plus</Link>
                <Link className="block rounded-xl px-3 py-2.5 hover:bg-hover" href="/settings">{t('settings')}</Link>
                <Link className="block rounded-xl px-3 py-2.5 hover:bg-hover sm:hidden" href="/nearby">{t('nav_nearby')}</Link>
                {me.staff && <Link className="block rounded-xl px-3 py-2.5 hover:bg-hover lg:hidden" href="/admin">{t('nav_dashboard')}</Link>}
                <div className="px-3 py-2"><LangSwitch /></div>
                <ThemeToggle className="block w-full rounded-xl px-3 py-2.5 text-left hover:bg-hover" />
                <button className="block w-full rounded-xl px-3 py-2.5 text-left text-danger hover:bg-hover" onClick={logout}>{t('log_out')}</button>
              </div>
            </details>
          </div>
        </div>
      </header>
      <main className="kv-main mx-auto max-w-7xl p-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-8">{children}</main>
      <Footer compact />
      <InstallBanner />
      <nav className="kv-bottom kv-chrome fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden" aria-label="Main">
        {BOTTOM.map((n, i) => n ? (
          <Link key={n[0]} href={n[0]} onClick={tap} aria-current={on(n[0]) ? 'page' : undefined} className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition active:scale-95 ${on(n[0]) ? 'text-brand-500' : 'text-muted'}`}>
            {on(n[0]) && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-500" />}
            <span className="relative"><i className={`fa-solid ${n[2]} text-xl`} />{n[0] === '/messages' && badge(msgUnread, 'absolute -right-3 -top-1.5 px-1 text-[9px]')}</span>{t(n[1])}
          </Link>
        ) : (
          <button key={i} onClick={() => { tap(); setPost(true); }} aria-label="Create post" className="flex flex-1 items-center justify-center"><span className="-mt-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 text-white shadow-lg shadow-brand-600/40 transition active:scale-90"><i className="fa-solid fa-plus text-lg" /></span></button>
        ))}
      </nav>
      <CreatePost open={post} onClose={() => setPost(false)} />
      <CallManager />
    </>
  );
}
