import Link from 'next/link';
import { allKnowledgePosts } from '@/lib/pipeline';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { getTopicMap } from '@/lib/enrichmentStore';
import { getPreservedKeys } from '@/lib/preservedStore';
import { postsInWindow, digestStats } from '@/lib/digest';
import { Feed } from '@/components/Feed';
import { DigestClient } from '@/components/DigestClient';

export const dynamic = 'force-dynamic';

const RANGES = [7, 14, 30];

// "Week in review": the posts captured in a recent window, with quick stats and a one-click
// AI digest. The review ritual the PO review asked for — what did I capture lately?
export default async function DigestPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = RANGES.includes(Number(daysParam)) ? Number(daysParam) : 7;

  const now = Math.floor(Date.now() / 1000);
  const posts = postsInWindow(allKnowledgePosts(), now, days);
  const stats = digestStats(posts, days);

  const feedProps = {
    savedKeys: [...bookmarkedKeys()],
    tagMap: getTagMap(),
    noteMap: getNoteMap(),
    topicMap: getTopicMap(),
    preservedKeys: [...getPreservedKeys()],
  };

  return (
    <>
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold text-fg">이번 주 요약</h1>
        <p className="text-sm text-secondary">최근에 캡처한 내용을 한눈에, 그리고 자세히 살펴보세요.</p>
      </div>

      <div className="flex gap-2 border-b border-border px-4 py-2">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/digest?days=${r}`}
            className={
              'rounded-full border px-3 py-1 text-xs ' +
              (days === r ? 'border-fg bg-fg text-bg' : 'border-border text-secondary hover:text-fg')
            }
          >
            {r}일
          </Link>
        ))}
      </div>

      <div className="px-4 py-3 text-sm text-secondary">
        <span className="text-fg">{stats.authors}</span>개 계정의 포스트{' '}
        <span className="text-fg">{stats.count}</span>개 · Threads {stats.byPlatform.threads}개 ·{' '}
        X {stats.byPlatform.x}개
        {stats.topAuthors.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {stats.topAuthors.map((a) => (
              <span key={a.username} className="rounded-full bg-elevated px-2 py-0.5 text-xs">
                @{a.username} <span className="text-secondary">{a.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {posts.length > 0 ? (
        <>
          <DigestClient days={days} />
          <Feed posts={posts} {...feedProps} />
        </>
      ) : (
        <p className="px-4 py-16 text-center text-secondary">
          최근 {days}일 동안 캡처한 내용이 없습니다.{' '}
          <Link href="/manage" className="text-fg hover:underline">
            관리
          </Link>{' '}
          탭에서 크롤하세요.
        </p>
      )}
    </>
  );
}
