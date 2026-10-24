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
import { LangSwitch, useT } from './LangProvider';
import { api } from '@/lib/client';

type Me = { username: string; displayName: string; avatarUrl: string | null; staff: boolean };
const NAV = [['/home', 'nav_home', 'fa-house'], ['/clips', 'nav_clips', 'fa-film'], ['/discover', 'nav_discover', 'fa-compass'], ['/connect', 'nav_connect', 'fa-heart'], ['/nearby', 'nav_nearby', 'fa-location-arrow'], ['/messages', 'nav_messages', 'fa-comments']];

export default function Shell({ me, children }: { me: Me; children: React.ReactNode }) {
  const path = usePathname(), r = useRouter(), t = useT();
  const [unread, setUnread] = useState(0), [msgUnread, setMsgUnread] = useState(0), [post, setPost] = useState(false), [q, setQ] = useState('');
  useEffect(() => {
    let on = true;
    const f = async () => { const x = await api('/api/notifications?count=1'); if (on && x.ok) { setUnread(x.data.unread); setMsgUnread(x.data.unreadMessages ?? 0); } };
    f(); const t = setInterval(f, 30000);
    const open = () => setPost(true);
    window.addEventListener('kv:compose', open);
    return () => { on = false; clearInterval(t); window.removeEventListener('kv:compose', open); };
  }, [path]);
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); r.push('/'); r.refresh(); }
  const on = (h: string) => path.startsWith(h);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-card/90 px-4 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link href="/home" aria-label="KazaVibe home"><Logo size={30} /></Link>
          <form className="hidden w-64 items-center rounded-full border border-line bg-bg px-3.5 py-1.5 focus-within:border-brand-600 md:flex lg:w-80" onSubmit={(e) => { e.preventDefault(); r.push(`/discover?q=${encodeURIComponent(q)}`); }}>
            <i className="fa-solid fa-magnifying-glass mr-2.5 text-sm text-muted" />
            <input aria-label="Search people" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search_people')} className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
          </form>
          <nav className="hidden items-center gap-1 rounded-full border border-line bg-bg/60 p-1 lg:flex" aria-label="Main">
            {NAV.map(([h, l]) => <Link key={h} href={h} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${on(h) ? 'bg-brand-600/10 text-brand-500' : 'text-muted hover:text-fg'}`}>{t(l)}{h === '/messages' && msgUnread > 0 && <b className="ml-1.5 rounded-full bg-brand-600 px-1.5 text-[10px] text-white">{msgUnread > 99 ? '99+' : msgUnread}</b>}</Link>)}
            {me.staff && <Link href="/admin" className={`rounded-full px-4 py-1.5 text-xs font-semibold ${on('/admin') ? 'bg-brand-600/10 text-brand-500' : 'text-muted hover:text-fg'}`}>{t('nav_dashboard')}</Link>}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setPost(true)} className="btn btn-sm hidden sm:block"><i className="fa-solid fa-plus mr-1" />{t('btn_post')}</button>
            <Link href="/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative rounded-xl p-2 text-muted hover:bg-hover hover:text-fg">
              <i className="fa-regular fa-bell text-lg" />{unread > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
            </Link>
            <details className="relative">
              <summary className="cursor-pointer list-none" aria-label="Account menu"><Avatar src={me.avatarUrl} name={me.displayName} size={34} /></summary>
              <div className="card absolute right-0 mt-2 w-48 space-y-1 p-2 text-sm shadow-xl">
                <Link className="block rounded-xl px-3 py-2 hover:bg-hover" href={`/profile/${me.username}`}>{t('my_profile')}</Link>
                <Link className="block rounded-xl px-3 py-2 hover:bg-hover" href="/plus"><i className="fa-solid fa-crown mr-2 text-brand-500" />KazaVibe Plus</Link>
                <Link className="block rounded-xl px-3 py-2 hover:bg-hover" href="/settings">{t('settings')}</Link>
                <Link className="block rounded-xl px-3 py-2 hover:bg-hover sm:hidden" href="/discover">{t('nav_discover')}</Link>
                <Link className="block rounded-xl px-3 py-2 hover:bg-hover sm:hidden" href="/nearby">{t('nav_nearby')}</Link>
                {me.staff && <Link className="block rounded-xl px-3 py-2 hover:bg-hover lg:hidden" href="/admin">{t('nav_dashboard')}</Link>}
                <div className="px-3 py-2"><LangSwitch /></div>
                <ThemeToggle className="block w-full rounded-xl px-3 py-2 text-left hover:bg-hover" />
                <button className="block w-full rounded-xl px-3 py-2 text-left text-danger hover:bg-hover" onClick={logout}>{t('log_out')}</button>
              </div>
            </details>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-3 pb-24 sm:p-6 sm:pb-8">{children}</main>
      <Footer compact />
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-card pb-[env(safe-area-inset-bottom)] sm:hidden" aria-label="Main">
        {[NAV[0], NAV[1], null, NAV[3], NAV[5]].map((n, i) => n
          ? <Link key={n[0]} href={n[0]} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${on(n[0]) ? 'text-brand-500' : 'text-muted'}`}><span className="relative"><i className={`fa-solid ${n[2]} text-lg`} />{n[0] === '/messages' && msgUnread > 0 && <b className="absolute -right-2.5 -top-1.5 rounded-full bg-brand-600 px-1 text-[9px] text-white">{msgUnread > 99 ? '99+' : msgUnread}</b>}</span>{t(n[1])}</Link>
          : <button key={i} onClick={() => setPost(true)} aria-label="Create post" className="flex flex-1 items-center justify-center"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 text-white shadow-lg"><i className="fa-solid fa-plus" /></span></button>)}
      </nav>
      <CreatePost open={post} onClose={() => setPost(false)} />
      <CallManager />
    </>
  );
}
