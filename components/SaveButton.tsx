'use client';

import { useState } from 'react';
import type { Post } from '@/lib/types';
import { BookmarkIcon } from './icons';

// In-feed save (bookmark) toggle. Saving stores the whole post — including its
// self-thread chain — so it shows up in the /saved feed. Optimistic, reverts on error.
export function SaveButton({ post, initialSaved = false }: { post: Post; initialSaved?: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const prev = saved;
    const next = !saved;
    setSaved(next); // optimistic
    setBusy(true);
    try {
      const res = next
        ? await fetch('/api/bookmarks/item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(post),
          })
        : await fetch('/api/bookmarks/item', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform: post.platform, id: post.id }),
          });
      if (!res.ok) setSaved(prev); // revert
    } catch {
      setSaved(prev);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? 'Remove bookmark' : 'Save'}
      title={saved ? 'Saved' : 'Save'}
      className="ml-auto rounded-full p-2 -m-2 text-fg hover:bg-elevated"
    >
      <BookmarkIcon filled={saved} />
    </button>
  );
}
