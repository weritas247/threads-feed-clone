import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCollection } from '@/lib/collectionStore';
import { allKnowledgePosts } from '@/lib/pipeline';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { getTopicMap, getEnrichmentMap } from '@/lib/enrichmentStore';
import { getStateMap, type CaptureState } from '@/lib/captureStateStore';
import { getEmbeddingMap } from '@/lib/embeddingStore';
import { getPreservedKeys } from '@/lib/preservedStore';
import { getEmbedder } from '@/lib/ai';
import {
  parseFilters,
  applyFilters,
  hybridRank,
  sortPosts,
  type SearchContext,
} from '@/lib/searchQuery';
import { parseQuery, mergeFilters } from '@/lib/queryParse';
import { Feed } from '@/components/Feed';
import { CollectionDetail } from '@/components/CollectionDetail';
import type { Post } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collection = getCollection(id);
  if (!collection) notFound();

  const all = allKnowledgePosts();
  let posts: Post[];

  if (collection.query) {
    // SMART collection: resolve the saved search live (keyword-ranked, no embedding call).
    const sp = Object.fromEntries(new URLSearchParams(collection.query)) as Record<string, string>;
    const parsed = parseQuery(sp.q ?? '');
    const filters = mergeFilters(parseFilters(sp), parsed.filters);
    const ctx: SearchContext = {
      enrichment: getEnrichmentMap(),
      state: getStateMap() as Record<string, CaptureState>,
      tagMap: getTagMap(),
      notes: getNoteMap(),
      vectors: getEmbeddingMap(),
      embedderId: getEmbedder().id,
      preserved: new Set(getPreservedKeys()),
    };
    const filtered = applyFilters(all, filters, ctx);
    posts = parsed.text ? hybridRank(filtered, parsed.text, null, ctx).map((r) => r.post) : sortPosts(filtered, 'recent');
  } else {
    // Manual collection: resolve keys → posts, preserving insertion order.
    const byKey = new Map<string, Post>();
    for (const p of all) byKey.set(`${p.platform}:${p.id}`, p);
    posts = collection.postKeys.map((k) => byKey.get(k)).filter((p): p is Post => Boolean(p));
  }

  const tagMap = getTagMap();
  const noteMap = getNoteMap();
  const savedKeys = [...bookmarkedKeys()];

  return (
    <>
      <div className="px-4 pt-4">
        <Link href="/collections" className="text-xs text-secondary hover:text-fg">
          ← 컬렉션
        </Link>
        <h1 className="mt-1 text-xl font-bold text-fg">
          {collection.query && '🔍 '}
          {collection.name}
        </h1>
        <p className="text-sm text-secondary">
          {collection.query ? '저장된 검색 · ' : ''}포스트 {posts.length}개
          {collection.query && (
            <>
              {' · '}
              <Link href={`/search?${collection.query}`} className="text-fg hover:underline">
                검색 열기
              </Link>
            </>
          )}
        </p>
      </div>

      {!collection.query && (
        <CollectionDetail id={collection.id} initialNote={collection.note} postCount={posts.length} />
      )}

      {posts.length > 0 ? (
        <Feed posts={posts} savedKeys={savedKeys} tagMap={tagMap} noteMap={noteMap} topicMap={getTopicMap()} />
      ) : collection.query ? (
        <p className="px-4 py-16 text-center text-secondary">이 저장된 검색에 맞는 포스트가 현재 없습니다.</p>
      ) : (
        <p className="px-4 py-16 text-center text-secondary">
          비어 있습니다. 피드에서 각 카드의 "담기" 버튼으로 포스트를 추가하세요.
        </p>
      )}
    </>
  );
}
