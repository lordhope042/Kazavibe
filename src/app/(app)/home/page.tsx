import HomeColumn from '@/components/HomeColumn';
import Suggestions from '@/components/Suggestions';
export default function Page() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2"><HomeColumn /></div>
      <aside className="hidden lg:block"><Suggestions /></aside>
    </div>
  );
}
