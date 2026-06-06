import Link from 'next/link';
import { allKnowledgePosts } from '@/lib/pipeline';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { getTopicMap } from '@/lib/enrichmentStore';
import { getPreservedKeys } from '@/lib/preservedStore';
import {
  getStateMap,
  filterByState,
  stateCounts,
  CAPTURE_STATES,
  type CaptureState,
} from '@/lib/captureStateStore';
import { Feed } from '@/components/Feed';

export const dynamic = 'force-dynamic';

const LABELS: Record<CaptureState, string> = {
  inbox: '받은함',
  kept: '킵',
  archived: '보관',
  discarded: '버림',
};

// Triage view — the core "use loop". New captures default to Inbox; reviewing them
// (Keep / Archive / Discard on each card) is how raw capture becomes curated knowledge.
export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state = 'inbox' } = await searchParams;
  const active: CaptureState = (CAPTURE_STATES as string[]).includes(state)
    ? (state as CaptureState)
    : 'inbox';

  const all = allKnowledgePosts().sort((a, b) => b.createdAt - a.createdAt);
  const counts = stateCounts(all);
  const posts = filterByState(all, active);

  const stateMap = getStateMap() as Record<string, CaptureState>;
  const tagMap = getTagMap();
  const noteMap = getNoteMap();
  const savedKeys = [...bookmarkedKeys()];

  return (
    <>
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold text-fg">분류</h1>
        <p className="text-sm text-secondary">
          캡처한 내용을 검토하고 의미 있는 것을 추려내세요. 받은함은 아직 분류하지 않은 모든 항목입니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
        {CAPTURE_STATES.map((s) => {
          const on = active === s;
          return (
            <Link
              key={s}
              href={`/inbox?state=${s}`}
              className={
                'rounded-full border px-3 py-1 text-xs ' +
                (on ? 'border-fg bg-fg text-bg' : 'border-border text-secondary hover:text-fg')
              }
            >
              {LABELS[s]} <span className="opacity-60">{counts[s]}</span>
            </Link>
          );
        })}
      </div>

      {posts.length > 0 ? (
        <Feed posts={posts} savedKeys={savedKeys} tagMap={tagMap} noteMap={noteMap} stateMap={stateMap} topicMap={getTopicMap()} preservedKeys={[...getPreservedKeys()]} />
      ) : (
        <p className="px-4 py-16 text-center text-secondary">
          {active === 'inbox'
            ? '받은함 비움 — 모든 캡처를 분류했습니다. 🎉'
            : `아직 ${LABELS[active]} 항목이 없습니다.`}
        </p>
      )}
    </>
  );
}
