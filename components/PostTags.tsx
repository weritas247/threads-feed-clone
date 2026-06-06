'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Post } from '@/lib/types';
import { TagIcon } from './icons';

// Per-post multi-tag editor shown on every feed's PostCard. Existing tags render as
// chips (click → tag search, × → remove); a subtle affordance reveals an inline input
// to add more. Tags persist in postTagStore (survives re-crawls), so they're shared
// across every feed the post appears in.
export function PostTags({ post, initialTags = [] }: { post: Post; initialTags?: string[] }) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function change(tag: string, op: 'add' | 'remove') {
    const t = tag.trim().toLowerCase();
    if (!t) return;
    setBusy(true);
    try {
      const res = await fetch('/api/posts/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: post.platform, id: post.id, tag: t, op }),
      });
      if (res.ok) setTags(((await res.json()) as { tags: string[] }).tags);
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
    await change(t, 'add');
  }

  // Clean default: no chips, just a quiet "Tag" affordance until used.
  if (tags.length === 0 && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mr-2 mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-secondary transition-colors hover:bg-elevated hover:text-fg"
      >
        <TagIcon className="h-[15px] w-[15px]" /> 태그
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[12px] text-fg"
        >
          <Link href={`/search?tag=${encodeURIComponent(t)}`} className="hover:underline">
            #{t}
          </Link>
          <button
            type="button"
            onClick={() => change(t, 'remove')}
            disabled={busy}
            aria-label={`태그 ${t} 삭제`}
            className="text-secondary hover:text-fg"
          >
            ×
          </button>
        </span>
      ))}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
            else if (e.key === 'Escape') {
              setDraft('');
              setEditing(false);
            }
          }}
          onBlur={() => {
            if (!draft.trim()) setEditing(false);
          }}
          placeholder="태그 추가…"
          disabled={busy}
          className="w-24 rounded-full border border-border bg-transparent px-2 py-0.5 text-[12px] text-fg outline-none placeholder:text-secondary/60"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="태그 추가"
          title="태그 추가"
          className="rounded-full px-1.5 py-0.5 text-secondary/60 hover:text-fg"
        >
          +
        </button>
      )}
    </div>
  );
}
