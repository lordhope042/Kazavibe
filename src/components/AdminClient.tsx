'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, ago } from '@/lib/client';

const TABS = ['Overview', 'Reports', 'Users', 'Payments', 'Verification', 'Audit log'] as const;
export default function AdminClient({ role }: { role: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview'), [data, setData] = useState<any>(null), [q, setQ] = useState(''), [status, setStatus] = useState(''), [err, setErr] = useState('');
  const load = useCallback(async () => {
    const url = { Overview: '/api/admin/overview', Reports: '/api/admin/reports', Users: `/api/admin/users?q=${encodeURIComponent(q)}`, Payments: `/api/admin/payments?status=${status}`, Verification: '/api/admin/verifications', 'Audit log': '/api/admin/audit' }[tab];
    const x = await api(url); setData(x.ok ? x.data : null); setErr(x.ok ? '' : (x.data as any).error ?? 'Could not load.');
  }, [tab, q, status]);
  useEffect(() => { setData(null); const t = setTimeout(load, tab === 'Users' ? 250 : 0); return () => clearTimeout(t); }, [load, tab]);
  async function reportAct(id: string, action: string) { if (action === 'suspend_user' && !confirm('Suspend this account?')) return; const note = prompt('Optional note for the audit log:') ?? undefined; const x = await api<any>(`/api/admin/reports/${id}`, 'POST', { action, note }); if (!x.ok) setErr(x.data.error); load(); }
  async function userAct(id: string, action: 'suspend' | 'restore' | 'grant_plus' | 'revoke_plus') { const reason = prompt('Reason (saved in the audit log):') ?? undefined; const x = await api<any>(`/api/admin/users/${id}`, 'POST', { action, reason }); if (!x.ok) setErr(x.data.error); load(); }
  async function verAct(id: string, action: 'approve' | 'reject') {
    const reason = action === 'reject' ? prompt('Reason shown to the member (optional):') ?? undefined : undefined;
    const x = await api<any>(`/api/admin/verifications/${id}`, 'POST', { action, reason }); setErr(x.ok ? '' : x.data.error ?? 'Could not do that.'); load();
  }
  async function payAct(id: string, action: 'recheck' | 'approve' | 'reject') {
    if (action !== 'recheck' && !confirm(action === 'approve' ? 'Grant Plus for this payment? Confirm it on the Paystack dashboard first.' : 'Reject this payment? No Plus will be granted.')) return;
    const x = await api<any>(`/api/admin/payments/${id}`, 'POST', { action });
    setErr(x.ok ? (action === 'recheck' ? `Paystack says: ${x.data.result}` : '') : x.data.error ?? 'Could not do that.'); load();
  }
  const stat = (n: string, v: number | string) => <div key={n} className="card p-4"><p className="text-2xl font-black">{v}</p><p className="text-xs text-muted">{n}</p></div>;
  return (
    <div className="mx-auto max-w-5xl"><h1 className="mb-4 text-2xl font-black">Dashboard</h1>
      <div className="mb-4 flex flex-wrap gap-2">{TABS.filter((t) => (t !== 'Audit log' && t !== 'Payments' && t !== 'Verification') || role === 'ADMIN').map((t) => <button key={t} onClick={() => setTab(t)} className={`chip ${tab === t ? 'chip-on' : ''}`}>{t}</button>)}</div>
      <p role="alert" className="mb-2 text-sm text-danger">{err}</p>
      {!data ? <p className="text-muted">Loading…</p> : tab === 'Overview' ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{[['Total members', data.members], ['New (30 days)', data.newMembers], ['Photos', data.photos], ['Clips', data.clips], ['Open reports', data.openReports], ['Restricted accounts', data.restricted], ['Plus members', data.plusMembers], ...(data.revenue30 !== undefined ? [['Revenue (30 days)', '₦' + Number(data.revenue30).toLocaleString('en-NG')], ['Payments to review', data.reviewPayments]] : [])].map(([n, v]) => stat(n as string, v as number | string))}</div>
      ) : tab === 'Reports' ? (data.length === 0 ? <div className="card p-8 text-center text-soft">No open reports.</div> :
        <ul className="space-y-3">{data.map((r: any) => (
          <li key={r.id} className="card p-4"><div className="flex flex-wrap justify-between gap-2 text-sm"><b>{r.category.replaceAll('_', ' ').toLowerCase()}</b><span className="text-muted">{r.targetType.toLowerCase()} · by @{r.reporter} · {ago(r.createdAt)}</span></div>
            <p className="mt-1 text-sm text-soft">{r.targetType === 'USER' ? <>Member: @{r.target.username} ({r.target.displayName})</> : <>Post by @{r.target.username}{r.target.removed && ' (already removed)'}: {r.target.caption || 'No caption'}</>}</p>
            {r.target.mediaUrl && (r.target.kind === 'CLIP' ? <video src={r.target.mediaUrl} controls className="mt-2 max-h-56 rounded-xl" /> : <img src={r.target.mediaUrl} alt="Reported content" className="mt-2 max-h-56 rounded-xl" />)}
            {r.details && <p className="mt-1 text-sm text-muted">&ldquo;{r.details}&rdquo;</p>}
            <div className="mt-3 flex flex-wrap gap-2"><button className="btn-ghost btn-sm" onClick={() => reportAct(r.id, 'dismiss')}>Dismiss</button><button className="btn-ghost btn-sm" onClick={() => reportAct(r.id, 'resolve')}>Resolve</button>
              {r.targetType === 'POST' && <button className="btn btn-sm" onClick={() => reportAct(r.id, 'remove_content')}>Remove post</button>}
              {role === 'ADMIN' && <button className="btn-ghost btn-sm !text-danger" onClick={() => reportAct(r.id, 'suspend_user')}>Suspend account</button>}</div></li>))}</ul>
      ) : tab === 'Users' ? (<>
        <input className="inp mb-3" placeholder="Search username or name" aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="space-y-2">{data.map((u: any) => <li key={u.id} className="card flex flex-wrap items-center gap-3 p-3"><div className="min-w-0 flex-1 text-sm"><b>{u.displayName}</b> <span className="text-muted">@{u.username} · {u.area}</span><p className="text-xs text-muted">{u.role} · {u.status} · {u.plan} · joined {ago(u.createdAt)} ago</p></div>
          {role === 'ADMIN' && u.role === 'MEMBER' && <button className="btn-ghost btn-sm" onClick={() => userAct(u.id, u.plan === 'PLUS' ? 'revoke_plus' : 'grant_plus')}>{u.plan === 'PLUS' ? 'Revoke Plus' : 'Give Plus (30 days)'}</button>}
          {role === 'ADMIN' && u.role === 'MEMBER' && (u.status === 'ACTIVE' ? <button className="btn-ghost btn-sm !text-danger" onClick={() => userAct(u.id, 'suspend')}>Suspend</button> : <button className="btn btn-sm" onClick={() => userAct(u.id, 'restore')}>Restore</button>)}</li>)}</ul></>
      ) : tab === 'Verification' ? (data.length === 0 ? <div className="card p-8 text-center text-soft">No selfies waiting for review.</div> :
        <ul className="space-y-3">{data.map((v: any) => (
          <li key={v.id} className="card p-4"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><b>@{v.username} ({v.displayName})</b><span className="text-muted">{ago(v.createdAt)} ago</span></div>
            <p className="mt-1 text-sm text-soft">The selfie should show their face and a paper with the code <b className="rounded bg-input px-2 py-0.5 text-fg">{v.code}</b>. Compare the face with their profile photo.</p>
            {v.selfieUrl && <img src={v.selfieUrl} alt="Verification selfie" className="mt-2 max-h-80 rounded-xl" />}
            <div className="mt-3 flex gap-2"><button className="btn btn-sm" onClick={() => verAct(v.id, 'approve')}>Approve and delete selfie</button><button className="btn-ghost btn-sm !text-danger" onClick={() => verAct(v.id, 'reject')}>Reject</button></div></li>))}</ul>
      ) : tab === 'Payments' ? (<>
        <select className="inp mb-3 w-auto" aria-label="Filter payments" value={status} onChange={(e) => setStatus(e.target.value)}>{['', 'REVIEW', 'PENDING', 'SUCCESS', 'FAILED'].map((s) => <option key={s} value={s}>{s || 'All payments'}</option>)}</select>
        {data.length === 0 ? <div className="card p-8 text-center text-soft">No payments.</div> : <ul className="space-y-2">{data.map((p: any) => (
          <li key={p.id} className="card p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>₦{p.amountNgn.toLocaleString('en-NG')} · {p.months} {p.months === 1 ? 'month' : 'months'}</b><span className={`text-xs font-semibold ${p.status === 'SUCCESS' ? 'text-good' : p.status === 'REVIEW' ? 'text-brand-500' : p.status === 'PENDING' ? 'text-muted' : 'text-danger'}`}>{p.status}</span></div>
            <p className="text-xs text-muted">@{p.username}{p.email && ` · ${p.email}`} · {ago(p.createdAt)} ago</p><p className="break-all text-[11px] text-muted">{p.reference}</p>
            {p.status !== 'SUCCESS' && <div className="mt-2 flex flex-wrap gap-2"><button className="btn-ghost btn-sm" onClick={() => payAct(p.id, 'recheck')}>Re-check with Paystack</button>{p.status === 'REVIEW' && <><button className="btn btn-sm" onClick={() => payAct(p.id, 'approve')}>Approve</button><button className="btn-ghost btn-sm !text-danger" onClick={() => payAct(p.id, 'reject')}>Reject</button></>}</div>}</li>))}</ul>}
      </>
      ) : (<ul className="space-y-2">{data.map((a: any) => <li key={a.id} className="card p-3 text-sm"><b>{a.action}</b> <span className="text-muted">· actor {a.actorId.slice(0, 8)} · target {a.targetId?.slice(0, 8)} · {ago(a.createdAt)} ago</span>{a.meta && <p className="text-xs text-muted">{JSON.stringify(a.meta)}</p>}</li>)}</ul>)}
    </div>
  );
}
