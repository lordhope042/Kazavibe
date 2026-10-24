import { currentUser } from '@/lib/auth';
import DiscoverClient from '@/components/DiscoverClient';
export default async function Page() {
  const me = await currentUser();
  return <DiscoverClient mode="nearby" initialArea={me!.profile!.area} paused={me!.profile!.locationPaused} />;
}
