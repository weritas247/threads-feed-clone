import { getAllSavedPosts } from '@/lib/postStore';
import { Feed } from '@/components/Feed';
import { FeedTabs } from '@/components/FeedTabs';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

// The home feed renders the saved archive (populated by crawling in the manage
// tab). Reading from storage keeps the tabs instant and reliable instead of
// re-scraping every platform on every page load.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const active = tab === 'threads' || tab === 'x' ? tab : 'all';
  const platform: Platform | null = active === 'all' ? null : active;

  const posts = getAllSavedPosts().filter((p) => !platform || p.platform === platform);

  return (
    <>
      <FeedTabs active={active} />
      {posts.length === 0 ? (
        <p className="px-4 py-16 text-center text-secondary">
          No posts yet. Add and crawl accounts from the{' '}
          <a href="/manage" className="underline">
            Manage
          </a>{' '}
          tab.
        </p>
      ) : (
        <Feed posts={posts} />
      )}
    </>
  );
}
