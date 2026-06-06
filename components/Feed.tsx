import type { Post } from '@/lib/types';
import type { CaptureState } from '@/lib/captureStateStore';
import { PostCard } from './PostCard';

// Renders every post at once. Used where the full list is wanted up front (search).
// For long archives prefer InfiniteFeed, which renders incrementally on scroll.
export function Feed({
  posts,
  highlight,
  savedKeys,
  tagMap,
  noteMap,
  stateMap,
  topicMap,
  preservedKeys,
}: {
  posts: Post[];
  highlight?: string[];
  savedKeys?: string[];
  tagMap?: Record<string, string[]>;
  noteMap?: Record<string, string>;
  stateMap?: Record<string, CaptureState>;
  topicMap?: Record<string, string[]>;
  preservedKeys?: string[];
}) {
  if (posts.length === 0) {
    return <p className="px-4 py-16 text-center text-secondary">표시할 포스트가 없습니다.</p>;
  }
  const saved = new Set(savedKeys);
  const preserved = new Set(preservedKeys);
  return (
    <div>
      {posts.map((p) => {
        const k = `${p.platform}:${p.id}`;
        return (
          <PostCard
            key={p.id}
            post={p}
            highlight={highlight}
            saved={saved.has(k)}
            tags={tagMap?.[k]}
            note={noteMap?.[k]}
            state={stateMap?.[k]}
            topics={topicMap?.[k]}
            preserved={preserved.has(k)}
          />
        );
      })}
    </div>
  );
}
