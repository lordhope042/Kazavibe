'use client';
import { useState } from 'react';
export type FollowState = 'none' | 'following' | 'requested';
export default function FollowButton({ username, initial }: { username: string; initial: FollowState }) {
  const [s, setS] = useState<FollowState>(initial), [busy, setBusy] = useState(false);
  async function click() {
    setBusy(true);
    const res = await fetch(`/api/users/${username}/follow`, { method: s === 'none' ? 'POST' : 'DELETE' });
    if (res.ok) setS((await res.json()).status);
    setBusy(false);
  }
  const label = s === 'following' ? 'Following' : s === 'requested' ? 'Requested' : 'Follow';
  return <button onClick={click} disabled={busy} className={s === 'none' ? 'btn btn-sm' : 'btn-ghost btn-sm'}>{label}</button>;
}
