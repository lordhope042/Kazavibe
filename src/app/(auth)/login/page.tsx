import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { currentUser } from '@/lib/auth';
export default async function Page() { if (await currentUser()) redirect('/home'); return <AuthForm mode="login" />; }
