import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import { avatarUrl } from '@/lib/posts';
import { planOf } from '@/lib/plan';
import SettingsForm from '@/components/SettingsForm';
import AppSettings from '@/components/AppSettings';
import PhoneSettings from '@/components/PhoneSettings';

export default async function Page() {
  const me = (await currentUser())!, p = me.profile!;
  const masked = me.phone && me.phoneVerifiedAt ? `${me.phone.slice(0, 4)}${'•'.repeat(Math.max(3, me.phone.length - 8))}${me.phone.slice(-4)}` : null;
  return (
    <>
      <SettingsForm initial={{ displayName: p.displayName, username: p.username, bio: p.bio, interests: p.interests, area: p.area, visibility: p.visibility, datingIntent: p.datingIntent, locationPaused: p.locationPaused, avatarUrl: avatarUrl(p.avatarPath), intent: p.intent, hidePhoto: p.hidePhoto, plan: planOf(me) }} />
      <div className="mx-auto mt-6 max-w-2xl space-y-6">
        <div className="card flex items-center justify-between gap-3 p-5"><div><h2 className="font-bold">Verification</h2><p className="text-sm text-soft">{p.verified ? 'Your account is verified.' : 'Get a verified badge after an administrator reviews a selfie.'}</p></div>{!p.verified && <Link href="/verification" className="btn btn-sm">Get verified</Link>}</div>
        <AppSettings />
        <PhoneSettings masked={masked} />
      </div>
    </>
  );
}
