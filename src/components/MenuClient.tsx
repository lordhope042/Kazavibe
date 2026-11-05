'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Avatar from './Avatar';
import ThemeToggle from './ThemeToggle';
import { LangSwitch, useT } from './LangProvider';

type P = { displayName: string; username: string; avatarUrl: string | null; staff: boolean; plus: boolean; verified: boolean };
const Row = ({ href, icon, label, hint }: { href: string; icon: string; label: string; hint?: string }) => (
  <Link href={href} className="flex items-center gap-3 px-4 py-3.5 active:bg-hover"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600/10 text-brand-500"><i className={`fa-solid ${icon}`} /></span><span className="flex-1 text-sm font-medium">{label}</span>{hint && <span className="text-xs text-muted">{hint}</span>}<i className="fa-solid fa-chevron-right text-xs text-muted" /></Link>
);
const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section><h2 className="px-4 pb-1 pt-4 text-xs font-bold uppercase tracking-wider text-muted">{title}</h2><div className="divide-y divide-line border-y border-line bg-card">{children}</div></section>
);

export default function MenuClient({ me }: { me: P }) {
  const r = useRouter(), t = useT();
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); r.push('/'); r.refresh(); }
  return (
    <div className="-mx-3 -mt-3 pb-4">
      <Link href={`/profile/${me.username}`} className="flex items-center gap-4 border-b border-line bg-card px-4 py-5 active:bg-hover">
        <Avatar src={me.avatarUrl} name={me.displayName} size={68} />
        <div className="min-w-0 flex-1"><p className="truncate text-lg font-black">{me.displayName}{me.verified && <i className="fa-solid fa-circle-check ml-1.5 text-sm text-brand-500" />}</p><p className="text-sm text-muted">@{me.username}</p><p className="mt-0.5 text-xs font-semibold text-brand-500">{me.plus ? 'KazaVibe Plus member' : 'View your profile'}</p></div>
        <i className="fa-solid fa-chevron-right text-xs text-muted" />
      </Link>
      <Group title="Account">
        <Row href="/settings" icon="fa-user-pen" label="Edit profile and privacy" />
        <Row href="/verification" icon="fa-circle-check" label="Get verified" hint={me.verified ? 'Verified' : undefined} />
        <Row href="/plus" icon="fa-crown" label="KazaVibe Plus" hint={me.plus ? 'Active' : undefined} />
        <Row href="/nearby" icon="fa-location-dot" label={t('nav_nearby')} />
        <Row href="/discover" icon="fa-compass" label={t('nav_discover')} />
        {me.staff && <Row href="/admin" icon="fa-gauge" label={t('nav_dashboard')} />}
      </Group>
      <Group title="Preferences">
        <div className="flex items-center justify-between px-4 py-3"><span className="flex items-center gap-3 text-sm font-medium"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600/10 text-brand-500"><i className="fa-solid fa-language" /></span>{t('language')}</span><LangSwitch /></div>
        <div className="flex items-center justify-between px-4 py-2"><span className="flex items-center gap-3 text-sm font-medium"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600/10 text-brand-500"><i className="fa-solid fa-circle-half-stroke" /></span>Appearance</span><ThemeToggle /></div>
      </Group>
      <Group title="Support">
        <Row href="/help" icon="fa-circle-question" label={t('help')} />
        <Row href="/safety" icon="fa-shield-halved" label={t('safety_centre')} />
        <Row href="/guidelines" icon="fa-book" label={t('guidelines')} />
        <Row href="/privacy" icon="fa-lock" label={t('privacy')} />
        <Row href="/terms" icon="fa-file-contract" label={t('terms')} />
      </Group>
      <div className="mt-4 border-y border-line bg-card"><button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-danger active:bg-hover"><span className="grid h-9 w-9 place-items-center rounded-xl bg-danger/10"><i className="fa-solid fa-arrow-right-from-bracket" /></span><span className="text-sm font-semibold">{t('log_out')}</span></button></div>
      <p className="pt-4 text-center text-[11px] text-muted">KazaVibe · Kazaure, Jigawa State</p>
    </div>
  );
}
