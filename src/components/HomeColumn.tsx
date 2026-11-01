'use client';
import ComposeBar from './ComposeBar';
import Feed from './Feed';
import PullToRefresh from './PullToRefresh';
export default function HomeColumn() {
  return (
    <PullToRefresh onRefresh={async () => { window.dispatchEvent(new Event('kv:posted')); await new Promise((r) => setTimeout(r, 700)); }}>
      <div className="space-y-6"><ComposeBar /><Feed feed="home" /></div>
    </PullToRefresh>
  );
}
