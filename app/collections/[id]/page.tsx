import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCollection } from '@/lib/collectionStore';
import { allKnowledgePosts } from '@/lib/pipeline';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { getTopicMap } from '@/lib/enrichmentStore';
import { Feed } from '@/components/Feed';
import { CollectionDetail } from '@/components/CollectionDetail';
import type { Post } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collection = getCollection(id);
  if (!collection) notFound();

  // Resolve keys → posts, preserving the collection's insertion order.
  const byKey = new Map<string, Post>();
  for (const p of allKnowledgePosts()) byKey.set(`${p.platform}:${p.id}`, p);
  const posts = collection.postKeys.map((k) => byKey.get(k)).filter((p): p is Post => Boolean(p));

  const tagMap = getTagMap();
  const noteMap = getNoteMap();
  const savedKeys = [...bookmarkedKeys()];

  return (
    <>
      <div className="px-4 pt-4">
        <Link href="/collections" className="text-xs text-secondary hover:text-fg">
          ← 컬렉션
        </Link>
        <h1 className="mt-1 text-xl font-bold text-fg">{collection.name}</h1>
        <p className="text-sm text-secondary">
          포스트 {posts.length}개
        </p>
      </div>

      <CollectionDetail id={collection.id} initialNote={collection.note} postCount={posts.length} />

      {posts.length > 0 ? (
        <Feed posts={posts} savedKeys={savedKeys} tagMap={tagMap} noteMap={noteMap} topicMap={getTopicMap()} />
      ) : (
        <p className="px-4 py-16 text-center text-secondary">
          비어 있습니다. 피드에서 각 카드의 "담기" 버튼으로 포스트를 추가하세요.
        </p>
      )}
    </>
  );
}
