import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { avatarUrl } from '@/lib/posts';
import OnboardingClient from '@/components/OnboardingClient';
export default async function Page() {
  const me = await currentUser();
  if (!me?.profile) redirect('/login');
  if (me.email && !me.emailVerifiedAt) redirect('/verify-email');
  if (me.profile.onboarded) redirect('/home');
  return <OnboardingClient name={me.profile.displayName} avatarUrl={avatarUrl(me.profile.avatarPath)} area={me.profile.area} />;
}
