import { currentUser } from '@/lib/auth';
import DiscoverClient from '@/components/DiscoverClient';
export default async function Page({ searchParams }: { searchParams: { q?: string } }) {
  const me = await currentUser();
  return <DiscoverClient mode="discover" initialQ={searchParams.q ?? ''} myArea={me?.profile?.area ?? ''} />;
}
