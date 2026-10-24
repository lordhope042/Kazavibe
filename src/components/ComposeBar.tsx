'use client';
export default function ComposeBar() {
  return <button onClick={() => window.dispatchEvent(new Event('kv:compose'))} className="card flex w-full items-center gap-3 p-4 text-left text-muted hover:bg-hover"><i className="fa-solid fa-circle-plus text-xl text-brand-500" />Share a photo or clip with Kazaure…</button>;
}
