import { fetchAccountFeed, normalizeUsername } from '@/lib/threads';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap, tagsForPosts, parseTagParam, filterPostsByTags } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { getTopicMap } from '@/lib/enrichmentStore';
import { getPreservedKeys } from '@/lib/preservedStore';
import { InfiniteFeed } from '@/components/InfiniteFeed';
import { FeedSummary } from '@/components/FeedSummary';
import { PostTagFilter } from '@/components/PostTagFilter';
import { AccountIcon } from '@/components/AccountIcon';
import type { Metadata } from 'next';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const handle = normalizeUsername(decodeURIComponent(username));
  return { title: `@${handle} · Threads` };
}

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ ptag?: string }>;
}) {
  const { username } = await params;
  const { ptag } = await searchParams;
  const handle = normalizeUsername(decodeURIComponent(username));
  const result = await fetchAccountFeed(handle);

  if (!result.ok) {
    const msg =
      result.reason === 'not_found' ? '계정을 찾을 수 없습니다.'
      : result.reason === 'private' ? '비공개 계정입니다.'
      : '지금은 이 계정을 불러올 수 없습니다.';
    return <p className="px-4 py-16 text-center text-secondary">{msg}</p>;
  }

  const tagMap = getTagMap();
  const selectedPtags = parseTagParam(ptag);
  const availableTags = tagsForPosts(result.posts, tagMap);
  const posts = filterPostsByTags(result.posts, selectedPtags, tagMap);
  const avatarUrl = result.posts[0]?.author.avatarUrl;

  return (
    <>
      <h2 className="flex items-center gap-2 px-4 pt-4 text-xl font-bold text-fg">
        <AccountIcon src={avatarUrl} username={handle} size={32} />@{handle}
      </h2>
      <PostTagFilter basePath={`/@${handle}`} params={{}} tags={availableTags} selected={selectedPtags} />
      {posts.length > 0 ? (
        <>
          <FeedSummary posts={posts} />
          <InfiniteFeed posts={posts} savedKeys={[...bookmarkedKeys()]} tagMap={tagMap} noteMap={getNoteMap()} topicMap={getTopicMap()} preservedKeys={[...getPreservedKeys()]} />
        </>
      ) : (
        <p className="px-4 py-16 text-center text-secondary">이 태그에 해당하는 포스트가 없습니다.</p>
      )}
    </>
  );
}
