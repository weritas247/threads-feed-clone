import Link from 'next/link';
import { allKnowledgePosts } from '@/lib/pipeline';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { getTopicMap } from '@/lib/enrichmentStore';
import { getPreservedKeys } from '@/lib/preservedStore';
import { calendarHeatmap, onThisDay, groupByDay } from '@/lib/timeline';
import { Feed } from '@/components/Feed';
import { TimelineHeatmap } from '@/components/TimelineHeatmap';

export const dynamic = 'force-dynamic';

const isoDay = /^\d{4}-\d{2}-\d{2}$/;
const fmtDay = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${y}년 ${Number(m)}월 ${Number(day)}일`;
};

// The time axis: an interactive contribution heatmap (hover for a day, click to drill in),
// "on this day" memories, and a day-sectioned feed. `?day=YYYY-MM-DD` focuses one day.
export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day } = await searchParams;
  const activeDay = day && isoDay.test(day) ? day : undefined;

  const posts = allKnowledgePosts();
  const now = Math.floor(Date.now() / 1000);
  const heatmap = calendarHeatmap(posts, now, 18);
  const memories = onThisDay(posts, now);

  const feedProps = {
    savedKeys: [...bookmarkedKeys()],
    tagMap: getTagMap(),
    noteMap: getNoteMap(),
    topicMap: getTopicMap(),
    preservedKeys: [...getPreservedKeys()],
  };

  // Drill-down: a single selected day's posts.
  const dayPosts = activeDay
    ? posts.filter((p) => new Date(p.createdAt * 1000).toISOString().slice(0, 10) === activeDay).sort((a, b) => b.createdAt - a.createdAt)
    : [];
  const sections = activeDay ? [] : groupByDay(posts).slice(0, 30);

  return (
    <>
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold text-fg">타임라인</h1>
        <p className="text-sm text-secondary">지식이 언제 만들어졌는지 — 칸에 마우스를 올리거나 클릭해 그날로.</p>
      </div>

      {heatmap.totalPosts > 0 && <TimelineHeatmap heatmap={heatmap} activeDay={activeDay} />}

      {/* Rich summary */}
      {heatmap.totalPosts > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-border px-4 py-2 text-xs text-secondary">
          <span>
            총 <span className="text-fg">{heatmap.totalPosts}</span> 포스트
          </span>
          <span>
            활동한 날 <span className="text-fg">{heatmap.activeDays}</span>일
          </span>
          <span>
            활동일 평균 <span className="text-fg">{heatmap.avgPerActiveDay}</span>개
          </span>
          {heatmap.busiest && (
            <span>
              가장 많은 날{' '}
              <Link href={`/timeline?day=${heatmap.busiest.date}`} className="text-fg hover:underline">
                {fmtDay(heatmap.busiest.date)}
              </Link>{' '}
              ({heatmap.busiest.count}개)
            </span>
          )}
        </div>
      )}

      {/* Day drill-down view */}
      {activeDay ? (
        <>
          <div className="flex items-center justify-between px-4 pt-3">
            <h2 className="text-sm font-semibold text-fg">
              {fmtDay(activeDay)} <span className="font-normal text-secondary">· 포스트 {dayPosts.length}개</span>
            </h2>
            <Link href="/timeline" className="text-xs text-secondary hover:text-fg">
              ← 전체 보기
            </Link>
          </div>
          {dayPosts.length > 0 ? (
            <Feed posts={dayPosts} {...feedProps} />
          ) : (
            <p className="px-4 py-16 text-center text-secondary">이 날에는 캡처한 포스트가 없습니다.</p>
          )}
        </>
      ) : (
        <>
          {memories.length > 0 && (
            <section>
              <h2 className="px-4 pt-4 text-sm font-semibold text-fg">📅 오늘의 기록</h2>
              <p className="px-4 pb-1 text-xs text-secondary">지난 해들의 포스트 {memories.length}개입니다.</p>
              <Feed posts={memories} {...feedProps} />
            </section>
          )}

          {sections.length === 0 ? (
            <p className="px-4 py-16 text-center text-secondary">
              아직 포스트가 없습니다. 크롤하거나 가져와서 타임라인을 만들어 보세요.
            </p>
          ) : (
            sections.map((s) => (
              <section key={s.day}>
                <h2 className="sticky top-0 z-[5] flex items-center justify-between bg-bg/95 px-4 py-1.5 text-sm font-semibold text-fg backdrop-blur">
                  <span>
                    {fmtDay(s.day)} <span className="font-normal text-secondary">· {s.posts.length}</span>
                  </span>
                  <Link href={`/timeline?day=${s.day}`} className="text-xs font-normal text-secondary hover:text-fg">
                    이 날만 →
                  </Link>
                </h2>
                <Feed posts={s.posts} {...feedProps} />
              </section>
            ))
          )}
        </>
      )}
    </>
  );
}
