import { getAllSavedPosts } from '@/lib/postStore';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap, tagsForPosts, parseTagParam, filterPostsByTags } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { getTopicMap } from '@/lib/enrichmentStore';
import { getPreservedKeys } from '@/lib/preservedStore';
import { allTags, accountsWithTag, vipAccounts } from '@/lib/accountStore';
import { InfiniteFeed } from '@/components/InfiniteFeed';
import { FeedTabs } from '@/components/FeedTabs';
import { FeedSummary } from '@/components/FeedSummary';
import { TagBar } from '@/components/TagBar';
import { PostTagFilter } from '@/components/PostTagFilter';
import { GettingStarted } from '@/components/GettingStarted';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

// The home feed renders the saved archive (populated by crawling in the manage tab),
// filtered by the active platform tab, an optional account tag / VIP filter, and an
// optional post-tag filter (`ptag`).
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; tag?: string; vip?: string; ptag?: string }>;
}) {
  const { tab, tag, vip, ptag } = await searchParams;
  const active = tab === 'threads' || tab === 'x' ? tab : 'all';
  const platform: Platform | null = active === 'all' ? null : active;

  const tags = allTags();
  const isVip = vip === '1';
  const activeTag = tag && tags.includes(tag) ? tag : undefined;
  const tagMap = getTagMap();
  const selectedPtags = parseTagParam(ptag);

  const allPosts = getAllSavedPosts();
  const archiveEmpty = allPosts.length === 0;
  let scoped = allPosts.filter((p) => !platform || p.platform === platform);
  if (isVip || activeTag) {
    const refs = isVip ? vipAccounts() : accountsWithTag(activeTag as string);
    const keys = new Set(refs.map((r) => `${r.platform}:${r.username}`));
    scoped = scoped.filter((p) => keys.has(`${p.platform}:${p.author.username.toLowerCase()}`));
  }
  // Only offer tags that actually appear in the currently-scoped feed (no dead chips).
  const postTags = tagsForPosts(scoped, tagMap);
  const posts = filterPostsByTags(scoped, selectedPtags, tagMap);

  const showFilters = tags.length > 0 || vipAccounts().length > 0;

  // Params other than ptag, preserved across both filter bars.
  const baseParams: Record<string, string> = {};
  if (active !== 'all') baseParams.tab = active;
  if (activeTag) baseParams.tag = activeTag;
  if (isVip) baseParams.vip = '1';

  // Brand-new archive: skip the feed chrome and show the getting-started guide instead.
  if (archiveEmpty) {
    return <GettingStarted />;
  }

  return (
    <>
      <FeedTabs active={active} />
      {showFilters && (
        <TagBar tab={active} tags={tags} activeTag={activeTag} vip={isVip} ptag={ptag} />
      )}
      <PostTagFilter basePath="/" params={baseParams} tags={postTags} selected={selectedPtags} />
      {posts.length > 0 && <FeedSummary posts={posts} />}
      {posts.length === 0 ? (
        <p className="px-4 py-16 text-center text-secondary">
          {selectedPtags.length > 0 ? (
            <>이 태그와 일치하는 포스트가 없습니다.</>
          ) : (
            <>
              아직 포스트가 없습니다.{' '}
              <a href="/manage" className="underline">
                관리
              </a>{' '}
              탭에서 계정을 추가하고 태그를 지정한 뒤 크롤하세요.
            </>
          )}
        </p>
      ) : (
        <InfiniteFeed posts={posts} savedKeys={[...bookmarkedKeys()]} tagMap={tagMap} noteMap={getNoteMap()} topicMap={getTopicMap()} preservedKeys={[...getPreservedKeys()]} />
      )}
    </>
  );
}
