import DiscoverClient from '@/components/DiscoverClient';
export default function Page({ searchParams }: { searchParams: { q?: string } }) { return <DiscoverClient mode="discover" initialQ={searchParams.q ?? ''} />; }
