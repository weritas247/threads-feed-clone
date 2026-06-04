import { FeedSkeleton } from '@/components/FeedSkeleton';

// Shown while the account's live feed is being scraped.
export default function Loading() {
  return (
    <>
      <div className="flex items-center gap-2 px-4 pt-4">
        <div className="h-8 w-8 animate-pulse rounded-full bg-elevated" />
        <div className="h-5 w-40 animate-pulse rounded bg-elevated" />
      </div>
      <div className="mt-4">
        <FeedSkeleton />
      </div>
    </>
  );
}
