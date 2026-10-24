import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import AdminClient from '@/components/AdminClient';
export default async function Page() {
  const me = (await currentUser())!;
  if (me.role === 'MEMBER') redirect('/home');
  return <AdminClient role={me.role} />;
}
