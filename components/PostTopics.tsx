'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Post } from '@/lib/types';

// Editable AI-extracted topics (distinct from manual #tags). Chips link to the topic hub;
// the × removes; "+ topic" adds. Edits persist to the enrichment record and survive
// re-enrichment (the store marks the record edited). Renders nothing if there are no
// topics and the user hasn't opened the adder — keeps quiet cards quiet.
export function PostTopics({ post, initialTopics = [] }: { post: Post; initialTopics?: string[] }) {
  const [topics, setTopics] = useState<string[]>(initialTopics);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function edit(action: 'add' | 'remove', topic: string) {
    setBusy(true);
    try {
      const r = await fetch('/api/posts/enrichment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, platform: post.platform, id: post.id, topic }),
      });
      const data = (await r.json()) as { topics?: string[] };
      if (data.topics) setTopics(data.topics);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {topics.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[11px] text-secondary"
        >
          <Link href={`/topics?t=${encodeURIComponent(t)}`} className="hover:text-fg" title="토픽 허브">
            {t}
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => edit('remove', t)}
            aria-label={`토픽 ${t} 삭제`}
            className="text-secondary/60 hover:text-fg"
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              edit('add', draft);
              setDraft('');
              setAdding(false);
            } else if (e.key === 'Escape') setAdding(false);
          }}
          onBlur={() => setAdding(false)}
          placeholder="토픽…"
          className="w-24 rounded-full border border-border bg-elevated px-2 py-0.5 text-[11px] text-fg outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-secondary/70 hover:text-fg"
        >
          + 토픽
        </button>
      )}
    </div>
  );
}
