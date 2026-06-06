import { allKnowledgePosts } from '@/lib/pipeline';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { getTopicMap, entityCounts, keysWithEntity } from '@/lib/enrichmentStore';
import { Feed } from '@/components/Feed';
import { FeedSummary } from '@/components/FeedSummary';
import { TopicCloud } from '@/components/TopicCloud';

export const dynamic = 'force-dynamic';

// Entity index: tools / people / companies / concepts the AI found across the archive.
// Picking one shows every post that mentions it — a second connection axis beside topics.
export default async function EntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e = '' } = await searchParams;
  const active = e.trim();
  const entities = entityCounts();

  let posts: ReturnType<typeof allKnowledgePosts> = [];
  if (active) {
    const keys = keysWithEntity(active);
    posts = allKnowledgePosts()
      .filter((p) => keys.has(`${p.platform}:${p.id}`))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  const tagMap = getTagMap();
  const noteMap = getNoteMap();
  const savedKeys = [...bookmarkedKeys()];

  return (
    <>
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold text-fg">엔티티</h1>
        <p className="text-sm text-secondary">
          아카이브에서 자동 추출된 도구, 인물, 회사, 개념입니다.
        </p>
      </div>

      {entities.length === 0 ? (
        <p className="px-4 py-16 text-center text-secondary">
          아직 엔티티가 없습니다. 크롤 관리에서 "보강 진행"을 실행하세요 (프로바이더 키가 있으면 더 풍부한 엔티티를 추출합니다).
        </p>
      ) : (
        <TopicCloud
          topics={entities.map((e) => ({ topic: e.name, count: e.count }))}
          active={active}
          basePath="/entities"
          param="e"
        />
      )}

      {active && (
        <>
          <p className="px-4 pt-3 text-sm text-secondary">
            <span className="text-fg">{active}</span> 을(를) 언급한 포스트 {posts.length}개
          </p>
          {posts.length > 0 && (
            <>
              <FeedSummary posts={posts} />
              <Feed posts={posts} savedKeys={savedKeys} tagMap={tagMap} noteMap={noteMap} topicMap={getTopicMap()} />
            </>
          )}
        </>
      )}
    </>
  );
}
