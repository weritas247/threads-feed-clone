import { getBookmarks, bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap, tagsForPosts, parseTagParam, filterPostsByTags } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { InfiniteFeed } from '@/components/InfiniteFeed';
import { FeedTabs } from '@/components/FeedTabs';
import { FeedSummary } from '@/components/FeedSummary';
import { PostTagFilter } from '@/components/PostTagFilter';
import { SavedClient } from '@/components/SavedClient';

export const dynamic = 'force-dynamic';

// The Saved feed shows posts you bookmarked on your own Threads account, imported
// via the Saved bookmarklet (see SavedClient). Separate from the crawled archive.
export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<{ ptag?: string }>;
}) {
  const { ptag } = await searchParams;
  const all = getBookmarks();
  const tagMap = getTagMap();
  const selectedPtags = parseTagParam(ptag);
  const posts = filterPostsByTags(all, selectedPtags, tagMap);

  return (
    <>
      <FeedTabs active="saved" />
      <SavedClient count={all.length} />
      {all.length > 0 && (
        <PostTagFilter
          basePath="/saved"
          params={{}}
          tags={tagsForPosts(all, tagMap)}
          selected={selectedPtags}
        />
      )}
      {all.length === 0 ? (
        <p className="px-4 py-16 text-center text-secondary">
          No saved posts yet. Use <span className="font-semibold text-fg">Import from Threads</span>{' '}
          above to bring in the posts you bookmarked on Threads.
        </p>
      ) : posts.length === 0 ? (
        <p className="px-4 py-16 text-center text-secondary">No saved posts match these tags.</p>
      ) : (
        <>
          <FeedSummary posts={posts} />
          <InfiniteFeed posts={posts} savedKeys={[...bookmarkedKeys()]} tagMap={tagMap} noteMap={getNoteMap()} />
        </>
      )}
    </>
  );
}
