import Link from 'next/link';
import { allKnowledgePosts } from '@/lib/pipeline';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { topicCounts, keysWithTopic, getTopicMap, relatedTopics } from '@/lib/enrichmentStore';
import { Feed } from '@/components/Feed';
import { FeedSummary } from '@/components/FeedSummary';
import { TopicMerge } from '@/components/TopicMerge';
import { TopicCloud } from '@/components/TopicCloud';

export const dynamic = 'force-dynamic';

// Auto-generated knowledge index: topics the AI extracted across the archive. Picking a
// topic shows every post about it — a connection layer above flat manual tags.
export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t = '' } = await searchParams;
  const active = t.trim().toLowerCase();
  const topics = topicCounts();

  let posts: ReturnType<typeof allKnowledgePosts> = [];
  if (active) {
    const keys = keysWithTopic(active);
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
        <h1 className="text-xl font-bold text-fg">토픽</h1>
        <p className="text-sm text-secondary">
          아카이브에서 자동 추출된 토픽입니다. 크롤 관리에서 포스트를 보강하면 채워집니다.
        </p>
      </div>

      {topics.length === 0 ? (
        <p className="px-4 py-16 text-center text-secondary">
          아직 토픽이 없습니다. 크롤 관리 페이지에서 "보강 진행"을 실행해 포스트를 데이터화하세요.
        </p>
      ) : (
        <TopicCloud topics={topics} active={active} />
      )}

      {active && (
        <>
          {(() => {
            const related = relatedTopics(active);
            return related.length > 0 ? (
              <div className="border-b border-border px-4 py-2">
                <span className="mr-1 text-xs text-secondary">관련 토픽:</span>
                {related.map(({ topic, count }) => (
                  <Link
                    key={topic}
                    href={`/topics?t=${encodeURIComponent(topic)}`}
                    className="mr-1.5 inline-block text-xs text-fg hover:underline"
                  >
                    {topic}
                    <span className="text-secondary/60"> {count}</span>
                  </Link>
                ))}
              </div>
            ) : null;
          })()}
          <div className="flex flex-wrap items-center gap-3 px-4 pt-3">
            <p className="text-sm text-secondary">
              <span className="text-fg">{active}</span> 관련 포스트 {posts.length}개
            </p>
            <TopicMerge topic={active} />
          </div>
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
