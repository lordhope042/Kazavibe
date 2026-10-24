'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import { api, ago } from '@/lib/client';

type C = { id: string; body: string; createdAt: string; parentId: string | null; canDelete: boolean; username: string; displayName: string; avatarUrl: string | null };

export default function Comments({ postId, onCount }: { postId: string; onCount?: (delta: number) => void }) {
  const [list, setList] = useState<C[] | null>(null), [text, setText] = useState(''), [err, setErr] = useState(''), [reply, setReply] = useState<C | null>(null);
  useEffect(() => { api<C[]>(`/api/posts/${postId}/comments`).then((x) => setList(x.ok ? x.data : [])); }, [postId]);
  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const x = await api<any>(`/api/posts/${postId}/comments`, 'POST', { body: text, parentId: reply?.id });
    if (!x.ok) return setErr(x.data.error ?? 'Could not post comment.');
    setList((l) => [...(l ?? []), x.data]); setText(''); setReply(null); onCount?.(1);
  }
  async function remove(c: C) {
    if (!confirm('Delete this comment?') || !(await api(`/api/comments/${c.id}`, 'DELETE')).ok) return;
    const gone = new Set([c.id, ...(list ?? []).filter((r) => r.parentId === c.id).map((r) => r.id)]);
    setList((l) => (l ?? []).filter((r) => !gone.has(r.id))); onCount?.(-gone.size);
  }
  function startReply(c: C) { setReply(c); setText(`@${c.username} `); document.getElementById(`c-input-${postId}`)?.focus(); }
  const Row = ({ c, small }: { c: C; small?: boolean }) => (
    <div className="flex gap-2.5">
      <Avatar src={c.avatarUrl} name={c.displayName} size={small ? 26 : 32} />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-input px-3 py-2 text-sm"><Link href={`/profile/${c.username}`} className="font-semibold">{c.displayName}</Link><p className="break-words text-soft">{c.body}</p></div>
        <div className="mt-0.5 flex gap-3 px-2 text-xs text-muted"><span>{ago(c.createdAt)}</span><button className="font-semibold hover:text-fg" onClick={() => startReply(c)}>Reply</button>{c.canDelete && <button className="hover:text-danger" onClick={() => remove(c)}>Delete</button>}</div>
      </div>
    </div>
  );
  const tops = (list ?? []).filter((c) => !c.parentId);
  return (
    <div className="space-y-3 p-4 pt-2">
      {list === null ? <p className="text-sm text-muted">Loading…</p> : tops.length === 0 ? <p className="text-sm text-muted">No comments yet. Start the conversation.</p> :
        tops.map((c) => (
          <div key={c.id} className="space-y-2"><Row c={c} />
            <div className="ml-9 space-y-2 border-l border-line pl-3">{(list ?? []).filter((r) => r.parentId === c.id).map((r) => <Row key={r.id} c={r} small />)}</div>
          </div>))}
      {reply && <p className="flex items-center justify-between rounded-xl bg-input px-3 py-1.5 text-xs text-soft">Replying to @{reply.username}<button aria-label="Cancel reply" onClick={() => { setReply(null); setText(''); }}><i className="fa-solid fa-xmark" /></button></p>}
      <form onSubmit={add} className="flex gap-2"><input id={`c-input-${postId}`} className="inp" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={reply ? 'Write a reply…' : 'Add a comment…'} aria-label="Add a comment" /><button className="btn btn-sm" disabled={!text.trim()}>Send</button></form>
      <p role="alert" className="text-xs text-danger">{err}</p>
    </div>
  );
}
