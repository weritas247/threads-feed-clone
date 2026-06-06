// Placeholder rows shown while a slow (network-scraped) feed loads, so the page paints
// instantly instead of staying blank during the fetch.
export function FeedSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="피드 불러오는 중">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 border-b border-border px-4 py-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-elevated" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-32 animate-pulse rounded bg-elevated" />
            <div className="h-3 w-full animate-pulse rounded bg-elevated" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}
