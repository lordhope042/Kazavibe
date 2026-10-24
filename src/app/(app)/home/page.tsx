import Feed from '@/components/Feed';
import Suggestions from '@/components/Suggestions';
import ComposeBar from '@/components/ComposeBar';
export default function Page() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2"><ComposeBar /><Feed feed="home" /></div>
      <aside className="hidden lg:block"><Suggestions /></aside>
    </div>
  );
}
