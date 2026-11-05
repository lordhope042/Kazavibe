import { currentUser } from '@/lib/auth';
import { avatarUrl } from '@/lib/posts';
import { planOf } from '@/lib/plan';
import MenuClient from '@/components/MenuClient';
export default async function Page() {
  const me = (await currentUser())!, p = me.profile!;
  return <MenuClient me={{ displayName: p.displayName, username: p.username, avatarUrl: avatarUrl(p.avatarPath), staff: me.role !== 'MEMBER', plus: planOf(me) === 'PLUS', verified: p.verified }} />;
}
