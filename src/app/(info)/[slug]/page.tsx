import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { INFO } from '@/lib/info';

export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(INFO).map((slug) => ({ slug }));
export const generateMetadata = ({ params }: { params: { slug: string } }): Metadata => ({ title: `${INFO[params.slug]?.title ?? 'KazaVibe'} · KazaVibe` });

export default function Page({ params }: { params: { slug: string } }) {
  const page = INFO[params.slug];
  if (!page) notFound();
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black">{page.title}</h1>
      <p className="mt-3 text-soft">{page.intro}</p>
      {page.draft && <p className="card mt-5 border-l-4 border-l-brand-600 p-4 text-sm text-soft"><b className="text-fg">Draft.</b> This document is a working draft and must be reviewed by a qualified Nigerian lawyer before KazaVibe launches publicly.</p>}
      <div className="mt-8 space-y-8">
        {page.sections.map((s) => (
          <section key={s.h}><h2 className="text-lg font-bold">{s.h}</h2>
            {s.p?.map((t) => <p key={t} className="mt-2 text-soft">{t}</p>)}
            {s.ul && <ul className="mt-2 list-disc space-y-1.5 pl-5 text-soft">{s.ul.map((t) => <li key={t}>{t}</li>)}</ul>}
          </section>))}
      </div>
      {params.slug === 'help' && <section className="card mt-10 p-5"><h2 className="font-bold">Still need help?</h2><p className="mt-1 text-sm text-soft">{email ? <>Email us at <a className="text-brand-500 underline" href={`mailto:${email}`}>{email}</a>.</> : 'Support email is coming soon.'}</p></section>}
    </main>
  );
}
