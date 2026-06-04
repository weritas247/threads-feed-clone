'use client';

import { useState } from 'react';
import type { Post } from '@/lib/types';
import { Avatar } from './Avatar';
import { MediaView } from './Media';
import { ActionBar } from './ActionBar';
import { Highlight } from './Highlight';

// Self-thread continuation. Collapsed by default so you read the lead post first and
// decide whether to open the rest of the thread.
export function ThreadChain({ posts, highlight }: { posts: Post[]; highlight?: string[] }) {
  const [open, setOpen] = useState(false);
  if (posts.length === 0) return null;

  const toggle = (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="mt-2 text-[13px] font-semibold text-secondary hover:text-fg"
    >
      {open ? 'Hide thread' : `Show this thread (${posts.length} more ${posts.length === 1 ? 'post' : 'posts'})`}
    </button>
  );

  if (!open) return toggle;

  return (
    <div className="mt-1">
      {posts.map((p) => (
        <div key={p.id} className="flex gap-3 pt-3">
          <div className="shrink-0 self-start">
            <Avatar src={p.author.avatarUrl} username={p.author.username} size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[15px] font-semibold text-fg">{p.author.username}</span>
            {p.text && (
              <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-[1.4] text-fg">
                <Highlight text={p.text} terms={highlight} />
              </p>
            )}
            <MediaView media={p.media} />
            <ActionBar stats={p.stats} />
          </div>
        </div>
      ))}
      {toggle}
    </div>
  );
}
