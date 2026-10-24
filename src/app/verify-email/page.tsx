import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { maskEmail } from '@/lib/validators';
import VerifyEmail from '@/components/VerifyEmail';
export default async function Page() {
  const me = await currentUser();
  if (!me) redirect('/login');
  if (!me.email || me.emailVerifiedAt) redirect(me.profile?.onboarded ? '/home' : '/onboarding');
  return <VerifyEmail masked={maskEmail(me.email)} />;
}
