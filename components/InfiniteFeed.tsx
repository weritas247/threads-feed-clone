'use client';

import { useEffect, useRef, useState } from 'react';
import type { Post } from '@/lib/types';
import { PostCard } from './PostCard';

const PAGE = 10;

// Client-side infinite scroll: the server hands over the whole post array, but we
// only mount the first PAGE cards and reveal more as a sentinel scrolls into view.
// Keeps initial render light for long feeds without a paginated API. (Search uses
// the plain Feed instead — it wants every match visible at once.)
export function InfiniteFeed({
  posts,
  highlight,
  savedKeys,
  tagMap,
  noteMap,
}: {
  posts: Post[];
  highlight?: string[];
  savedKeys?: string[];
  tagMap?: Record<string, string[]>;
  noteMap?: Record<string, string>;
}) {
  const [count, setCount] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // Reset the window when the underlying list changes (e.g. tab/filter switch).
  useEffect(() => {
    setCount(PAGE);
  }, [posts]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || count >= posts.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCount((c) => Math.min(c + PAGE, posts.length));
        }
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [count, posts.length]);

  if (posts.length === 0) {
    return <p className="px-4 py-16 text-center text-secondary">No posts to show.</p>;
  }

  const saved = new Set(savedKeys);
  const visible = posts.slice(0, count);
  return (
    <div>
      {visible.map((p) => {
        const k = `${p.platform}:${p.id}`;
        return (
          <PostCard
            key={p.id}
            post={p}
            highlight={highlight}
            saved={saved.has(k)}
            tags={tagMap?.[k]}
            note={noteMap?.[k]}
          />
        );
      })}
      {count < posts.length && <div ref={sentinel} className="h-10" aria-hidden />}
    </div>
  );
}
