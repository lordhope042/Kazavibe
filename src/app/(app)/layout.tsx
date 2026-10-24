import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { avatarUrl } from '@/lib/posts';
import Shell from '@/components/Shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await currentUser();
  if (!me?.profile) redirect('/login');
  if (me.email && !me.emailVerifiedAt) redirect('/verify-email');
  if (!me.profile.onboarded) redirect('/onboarding');
  const p = me.profile;
  return <Shell me={{ username: p.username, displayName: p.displayName, avatarUrl: avatarUrl(p.avatarPath), staff: me.role !== 'MEMBER' }}>{children}</Shell>;
}
