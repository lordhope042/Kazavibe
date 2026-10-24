import { redirect } from 'next/navigation';
import PhoneLogin from '@/components/PhoneLogin';
import { currentUser } from '@/lib/auth';
export default async function Page() { if (await currentUser()) redirect('/home'); return <PhoneLogin />; }
