'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FollowButton, { type FollowState } from './FollowButton';
import { REPORT_CATEGORIES } from '@/lib/areas';

export default function ProfileActions({ username, initial }: { username: string; initial: FollowState }) {
  const r = useRouter(), [msg, setMsg] = useState(''), [open, setOpen] = useState(false);
  async function block() {
    if (!confirm('Block this member? They will no longer be able to find or contact you.')) return;
    const res = await fetch('/api/blocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
    if (res.ok) { r.push('/discover'); r.refresh(); }
  }
  async function report(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const category = new FormData(e.currentTarget).get('category');
    const res = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, category }) });
    setMsg(res.ok ? 'Report sent for review. Thank you.' : 'Could not send the report.'); setOpen(false);
  }
  return (
    <div className="mt-4">
      <div className="flex flex-wrap justify-center gap-2">
        <FollowButton username={username} initial={initial} />
        <Link href={`/messages?u=${username}`} className="btn-ghost btn-sm">Message</Link>
        <button className="btn-ghost btn-sm" onClick={() => setOpen(!open)}>Report</button>
        <button className="btn-ghost btn-sm" onClick={block}>Block</button>
      </div>
      {open && <form onSubmit={report} className="mx-auto mt-3 flex max-w-xs gap-2"><select name="category" className="inp" aria-label="Report reason">{REPORT_CATEGORIES.map((c) => <option key={c} value={c}>{c.replaceAll('_', ' ').toLowerCase()}</option>)}</select><button className="btn btn-sm">Send</button></form>}
      <p role="status" className="mt-2 text-sm text-good">{msg}</p>
    </div>
  );
}
