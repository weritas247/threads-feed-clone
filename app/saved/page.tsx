import { getBookmarks, bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap, tagsForPosts, parseTagParam, filterPostsByTags } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { getTopicMap } from '@/lib/enrichmentStore';
import { getPreservedKeys } from '@/lib/preservedStore';
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
          아직 저장된 포스트가 없습니다. 위의 <span className="font-semibold text-fg">Threads에서 가져오기</span>를{' '}
          사용해 Threads에서 저장한 포스트를 가져오세요.
        </p>
      ) : posts.length === 0 ? (
        <p className="px-4 py-16 text-center text-secondary">이 태그와 일치하는 저장된 포스트가 없습니다.</p>
      ) : (
        <>
          <FeedSummary posts={posts} />
          <InfiniteFeed posts={posts} savedKeys={[...bookmarkedKeys()]} tagMap={tagMap} noteMap={getNoteMap()} topicMap={getTopicMap()} preservedKeys={[...getPreservedKeys()]} />
        </>
      )}
    </>
  );
}
