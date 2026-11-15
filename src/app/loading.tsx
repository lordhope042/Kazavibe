import Logo from '@/components/Logo';

export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="grid min-h-[min(100dvh,720px)] place-items-center px-6 py-12"
    >
      <div role="status" aria-live="polite" className="text-center">
        <span className="relative mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[1.75rem] border border-brand-600/25 bg-brand-600/10 shadow-lg shadow-brand-600/10">
          <span className="kv-loader-ring" aria-hidden="true" />
          <Logo size={48} markOnly />
        </span>
        <p className="text-lg font-extrabold tracking-tight">Kaza<span className="text-brand">Vibe</span></p>
        <p className="mt-1 text-sm text-muted">Loading your vibe…</p>
        <span className="sr-only">Loading page</span>
      </div>
    </main>
  );
}
