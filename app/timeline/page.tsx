import { allKnowledgePosts } from '@/lib/pipeline';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { getTopicMap } from '@/lib/enrichmentStore';
import { getPreservedKeys } from '@/lib/preservedStore';
import { activityByDay, onThisDay, groupByDay } from '@/lib/timeline';
import { Feed } from '@/components/Feed';

export const dynamic = 'force-dynamic';

// The time axis: an activity strip, "on this day" memories, and a day-sectioned feed.
export default function TimelinePage() {
  const posts = allKnowledgePosts();
  const now = Math.floor(Date.now() / 1000);
  const activity = activityByDay(posts).slice(0, 60); // last ~60 active days
  const memories = onThisDay(posts, now);
  const sections = groupByDay(posts).slice(0, 30); // most recent 30 days

  const tagMap = getTagMap();
  const noteMap = getNoteMap();
  const topicMap = getTopicMap();
  const savedKeys = [...bookmarkedKeys()];
  const preservedKeys = [...getPreservedKeys()];
  const maxDay = Math.max(1, ...activity.map((a) => a.count));

  const feedProps = { savedKeys, tagMap, noteMap, topicMap, preservedKeys };

  return (
    <>
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold text-fg">타임라인</h1>
        <p className="text-sm text-secondary">아카이브 전체에 걸쳐 지식이 언제 만들어졌는지 보여줍니다.</p>
      </div>

      {activity.length > 0 && (
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-end gap-[3px]" style={{ height: 48 }}>
            {[...activity].reverse().map((a) => (
              <div
                key={a.day}
                title={`${a.day}: ${a.count}`}
                className="flex-1 rounded-t bg-fg/60"
                style={{ height: `${Math.max(6, (a.count / maxDay) * 100)}%` }}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-secondary">활동한 날 {activity.length}일 · 가장 많은 날: 포스트 {maxDay}개</p>
        </div>
      )}

      {memories.length > 0 && (
        <section>
          <h2 className="px-4 pt-4 text-sm font-semibold text-fg">📅 오늘의 기록</h2>
          <p className="px-4 pb-1 text-xs text-secondary">
            지난 해들의 포스트 {memories.length}개입니다.
          </p>
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
            <h2 className="sticky top-0 z-[5] bg-bg/95 px-4 py-1.5 text-sm font-semibold text-fg backdrop-blur">
              {s.day} <span className="font-normal text-secondary">· {s.posts.length}</span>
            </h2>
            <Feed posts={s.posts} {...feedProps} />
          </section>
        ))
      )}
    </>
  );
}
