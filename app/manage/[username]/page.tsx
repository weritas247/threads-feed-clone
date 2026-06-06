import Link from 'next/link';
import { getSavedPosts } from '@/lib/postStore';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap, tagsForPosts, parseTagParam, filterPostsByTags } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { getTopicMap } from '@/lib/enrichmentStore';
import { getPreservedKeys } from '@/lib/preservedStore';
import { InfiniteFeed } from '@/components/InfiniteFeed';
import { FeedSummary } from '@/components/FeedSummary';
import { PostTagFilter } from '@/components/PostTagFilter';
import { AccountIcon } from '@/components/AccountIcon';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function SavedPostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ platform?: string; ptag?: string }>;
}) {
  const { username } = await params;
  const { platform: rawPlatform, ptag } = await searchParams;
  const platform: Platform = rawPlatform === 'x' ? 'x' : 'threads';
  const handle = decodeURIComponent(username).trim().replace(/^@+/, '').toLowerCase();
  const all = getSavedPosts(handle, platform);

  const tagMap = getTagMap();
  const selectedPtags = parseTagParam(ptag);
  const availableTags = tagsForPosts(all, tagMap);
  const posts = filterPostsByTags(all, selectedPtags, tagMap);

  return (
    <>
      <div className="px-4 pt-4">
        <Link href="/manage" className="text-sm text-secondary hover:underline">
          ← 크롤 관리
        </Link>
      </div>
      <h2 className="flex items-center gap-2 px-4 pb-1 pt-2 text-xl font-bold text-fg">
        <AccountIcon src={all[0]?.author.avatarUrl} username={handle} size={32} />
        저장됨 · @{handle}{' '}
        <span className="rounded bg-elevated px-1.5 py-0.5 text-xs font-normal text-secondary">
          {platform === 'x' ? 'X' : 'Threads'}
        </span>
        <span className="text-secondary">({all.length})</span>
      </h2>
      {all.length > 0 && (
        <PostTagFilter
          basePath={`/manage/${handle}`}
          params={{ platform }}
          tags={availableTags}
          selected={selectedPtags}
        />
      )}
      {all.length === 0 ? (
        <p className="px-4 py-16 text-center text-secondary">
          저장된 포스트가 아직 없습니다. 크롤 관리 탭에서 이 계정을 크롤하세요.
        </p>
      ) : posts.length === 0 ? (
        <p className="px-4 py-16 text-center text-secondary">이 태그에 해당하는 저장된 포스트가 없습니다.</p>
      ) : (
        <>
          <FeedSummary posts={posts} />
          <InfiniteFeed posts={posts} savedKeys={[...bookmarkedKeys()]} tagMap={tagMap} noteMap={getNoteMap()} topicMap={getTopicMap()} preservedKeys={[...getPreservedKeys()]} />
        </>
      )}
    </>
  );
}
