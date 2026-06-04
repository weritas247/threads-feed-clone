import { fetchXAccountFeed, normalizeXHandle } from '@/lib/x';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap, tagsForPosts, parseTagParam, filterPostsByTags } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
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
  const handle = normalizeXHandle(decodeURIComponent(username));
  return { title: `@${handle} · X` };
}

export default async function XAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ ptag?: string }>;
}) {
  const { username } = await params;
  const { ptag } = await searchParams;
  const handle = normalizeXHandle(decodeURIComponent(username));
  const result = await fetchXAccountFeed(handle);

  if (!result.ok) {
    const msg =
      result.reason === 'not_found'
        ? 'Account not found.'
        : 'Could not load this account right now.';
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
        <span className="rounded bg-elevated px-1.5 py-0.5 text-xs font-normal text-secondary">X</span>
      </h2>
      <PostTagFilter basePath={`/x/${handle}`} params={{}} tags={availableTags} selected={selectedPtags} />
      {posts.length > 0 ? (
        <>
          <FeedSummary posts={posts} />
          <InfiniteFeed posts={posts} savedKeys={[...bookmarkedKeys()]} tagMap={tagMap} noteMap={getNoteMap()} />
        </>
      ) : (
        <p className="px-4 py-16 text-center text-secondary">No posts match these tags.</p>
      )}
    </>
  );
}
