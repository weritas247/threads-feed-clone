import { FeedSkeleton } from '@/components/FeedSkeleton';

// Instant fallback for the Saved feed while it renders on the server.
export default function Loading() {
  return (
    <>
      <div className="sticky top-0 z-10 flex border-b border-border bg-bg/95 backdrop-blur">
        {['전체', 'Threads', 'X', '저장됨'].map((l) => (
          <div key={l} className="flex-1 py-3 text-center text-sm font-semibold text-secondary/40">
            {l}
          </div>
        ))}
      </div>
      <FeedSkeleton rows={5} />
    </>
  );
}
