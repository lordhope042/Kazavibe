import Link from 'next/link';
import path from 'path';
import { existsSync } from 'fs';
import { redirect } from 'next/navigation';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import Footer from '@/components/Footer';
import { LangSwitch } from '@/components/LangProvider';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLang } from '@/lib/lang';
import { tr } from '@/lib/i18n';

const FEATURES = [['fa-compass', 'f1'], ['fa-film', 'f2'], ['fa-user-plus', 'f3'], ['fa-comments', 'f4'], ['fa-location-dot', 'f5'], ['fa-shield-halved', 'f6']] as const;
const STEPS = ['s1', 's2', 's3'] as const;
// Optional hero images: drop showcase-1/2/3 (.jpg/.webp/.png) into public/landing and they appear automatically.
const tiles = [
  { n: 'showcase-1', h: 'h-40 sm:h-56', ic: 'fa-film', t: 'Clips', g: 'from-brand-600 to-amber-500' },
  { n: 'showcase-2', h: 'h-48 sm:h-64', ic: 'fa-compass', t: 'People', g: 'from-amber-500 to-brand-600' },
  { n: 'showcase-3', h: 'h-40 sm:h-56', ic: 'fa-comments', t: 'Chat', g: 'from-brand-500 to-amber-400' },
].map((t) => {
  const ext = ['jpg', 'webp', 'png'].find((e) => existsSync(path.join(process.cwd(), 'public', 'landing', `${t.n}.${e}`)));
  return { ...t, src: ext ? `/landing/${t.n}.${ext}` : null };
});

export default async function Landing() {
  if (await currentUser()) redirect('/home');
  const L = getLang(), t = (k: Parameters<typeof tr>[1]) => tr(L, k);
  const [members, posts] = await Promise.all([prisma.user.count(), prisma.post.count({ where: { status: 'VISIBLE' } })]);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-card/90 px-4 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" aria-label="KazaVibe home"><Logo size={32} /></Link>
          <nav className="hidden items-center gap-1 rounded-full border border-line bg-bg/60 p-1 md:flex" aria-label="Sections">
            {[['#features', 'nav_features'], ['#how', 'nav_how'], ['#safety', 'nav_safety']].map(([h, k]) => <a key={h} href={h} className="rounded-full px-4 py-1.5 text-xs font-semibold text-muted transition hover:text-fg">{t(k as 'nav_features')}</a>)}
          </nav>
          <div className="flex items-center gap-2"><LangSwitch /><ThemeToggle /><Link href="/login" className="btn-ghost btn-sm">{t('log_in')}</Link><Link href="/register" className="btn btn-sm">{t('sign_up')}</Link></div>
        </div>
      </header>
      <main className="flex-1">
        <section className="mx-auto max-w-4xl space-y-6 px-4 py-12 text-center md:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-600/30 bg-brand-600/10 px-3.5 py-1.5 text-xs font-semibold text-brand-500"><i className="fa-solid fa-location-dot" /> Kazaure, Jigawa State</span>
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">{t('hero_1')} <br className="hidden sm:inline" /><span className="bg-gradient-to-r from-brand-500 via-amber-400 to-brand-600 bg-clip-text text-transparent">{t('hero_2')}</span></h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-soft sm:text-base">{t('hero_sub')}</p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2"><Link href="/register" className="btn px-8 py-3.5 text-sm shadow-xl">{t('create_account')} <i className="fa-solid fa-arrow-right ml-1.5" /></Link><a href="#how" className="btn-ghost px-7 py-3.5 text-sm"><i className="fa-solid fa-circle-play mr-2 text-brand-500" />{t('see_how')}</a></div>
          <div className="mx-auto grid max-w-xl grid-cols-3 gap-3 pt-8">
            {[[String(members), t('stat_members'), false], [String(posts), t('stat_posts'), false], ['18+', t('stat_adults'), true]].map(([n, l, hi]) => <div key={String(l)} className="card rounded-2xl p-3.5 text-center"><p className={`text-xl font-black sm:text-2xl ${hi ? 'text-brand-500' : ''}`}>{n}</p><p className="text-[11px] font-medium text-muted">{l}</p></div>)}
          </div>
          <div className="relative mx-auto max-w-2xl pt-8">
            <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-brand-600/20 to-amber-500/20 blur-3xl" aria-hidden="true" />
            <div className="card grid grid-cols-3 items-center gap-3 p-4 shadow-2xl sm:gap-4">
              {tiles.map((x) => x.src ? <img key={x.n} src={x.src} alt="" className={`${x.h} w-full rounded-2xl border border-line object-cover`} /> : <div key={x.n} className={`${x.h} grid w-full place-items-center rounded-2xl bg-gradient-to-br ${x.g} text-white`} aria-hidden="true"><span><i className={`fa-solid ${x.ic} text-3xl`} /><span className="mt-1 block text-xs font-bold">{x.t}</span></span></div>)}
            </div>
          </div>
        </section>
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8"><h2 className="mb-6 text-center text-2xl font-black">{t('features_title')}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{FEATURES.map(([i, k]) => <div key={k} className="card p-5 transition hover:bg-hover"><span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-600/10 text-brand-500"><i className={`fa-solid ${i}`} /></span><h3 className="font-semibold">{t(`${k}_t` as 'f1_t')}</h3><p className="mt-1 text-sm text-soft">{t(`${k}_d` as 'f1_d')}</p></div>)}</div></section>
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8"><h2 className="mb-6 text-center text-2xl font-black">{t('how_title')}</h2>
          <ol className="grid gap-3 md:grid-cols-3">{STEPS.map((k, i) => <li key={k} className="card p-5"><span className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-tr from-brand-600 to-amber-500 text-sm font-black text-white">{i + 1}</span><h3 className="font-semibold">{t(`${k}_t` as 's1_t')}</h3><p className="mt-1 text-sm text-soft">{t(`${k}_d` as 's1_d')}</p></li>)}</ol></section>
        <section id="safety" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8"><div className="card border-l-4 border-l-brand-600 p-6"><h2 className="font-bold"><i className="fa-solid fa-shield-halved mr-2 text-brand-500" />{t('safety_title')}</h2><p className="mt-2 text-sm text-soft">{t('safety_text')}</p></div></section>
        <section className="mx-auto max-w-3xl px-4 py-12 text-center"><h2 className="text-3xl font-black">{t('cta_title')}</h2><p className="mt-2 text-soft">{t('cta_sub')}</p><Link href="/register" className="btn mt-6 inline-block px-8 py-3.5 text-sm">{t('create_account')}</Link></section>
      </main>
      <Footer />
    </div>
  );
}
