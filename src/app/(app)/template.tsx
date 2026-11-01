// Re-mounts on every page change, which replays the short fade-in. Opacity only, so fixed-position popups are never affected.
export default function Template({ children }: { children: React.ReactNode }) { return <div className="kv-page">{children}</div>; }
