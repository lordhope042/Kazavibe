import ConnectionsClient from '@/components/ConnectionsClient';
export default function Page({ params, searchParams }: { params: { username: string }; searchParams: { tab?: string } }) {
  return <ConnectionsClient username={params.username} initialTab={searchParams.tab === 'following' ? 'following' : 'followers'} />;
}
