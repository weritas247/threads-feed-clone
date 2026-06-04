import { getAllSavedPosts } from '@/lib/postStore';
import { allTags, accountsWithTag, vipAccounts } from '@/lib/accountStore';
import { Feed } from '@/components/Feed';
import { FeedTabs } from '@/components/FeedTabs';
import { TagBar } from '@/components/TagBar';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

// The home feed renders the saved archive (populated by crawling in the manage
// tab), filtered by the active platform tab and an optional tag / VIP filter.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; tag?: string; vip?: string }>;
}) {
  const { tab, tag, vip } = await searchParams;
  const active = tab === 'threads' || tab === 'x' ? tab : 'all';
  const platform: Platform | null = active === 'all' ? null : active;

  const tags = allTags();
  const isVip = vip === '1';
  const activeTag = tag && tags.includes(tag) ? tag : undefined;

  let posts = getAllSavedPosts().filter((p) => !platform || p.platform === platform);
  if (isVip || activeTag) {
    const refs = isVip ? vipAccounts() : accountsWithTag(activeTag as string);
    const keys = new Set(refs.map((r) => `${r.platform}:${r.username}`));
    posts = posts.filter((p) => keys.has(`${p.platform}:${p.author.username.toLowerCase()}`));
  }

  const showFilters = tags.length > 0 || vipAccounts().length > 0;

  return (
    <>
      <FeedTabs active={active} />
      {showFilters && <TagBar tab={active} tags={tags} activeTag={activeTag} vip={isVip} />}
      {posts.length === 0 ? (
        <p className="px-4 py-16 text-center text-secondary">
          No posts here yet. Add, tag and crawl accounts from the{' '}
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
