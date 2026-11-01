export const Skeleton = ({ className = '' }: { className?: string }) => <div aria-hidden="true" className={`kv-skel ${className}`} />;
export const PostSkeleton = () => (
  <div className="card overflow-hidden p-4" role="status" aria-label="Loading">
    <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-32 rounded-full" /><Skeleton className="h-3 w-20 rounded-full" /></div></div>
    <Skeleton className="mt-4 h-64 w-full rounded-2xl" />
  </div>
);
export const RowSkeleton = () => (
  <div className="card flex items-center gap-3 p-3" role="status" aria-label="Loading"><Skeleton className="h-12 w-12 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-40 rounded-full" /><Skeleton className="h-3 w-24 rounded-full" /></div></div>
);
