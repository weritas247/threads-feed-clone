'use client';

import { useState } from 'react';
import type { Post } from '@/lib/types';
import { LinkIcon } from './icons';

interface Related {
  id: string;
  platform: 'threads' | 'x';
  username: string;
  permalink: string;
  text: string;
  score: number;
}

// "Connect" affordance: on demand, fetch posts semantically closest to this one. Lazy so
// it costs nothing until clicked. Empty result = post not embedded yet (run the pipeline).
export function RelatedPosts({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Related[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (items) return;
    setBusy(true);
    try {
      const res = await fetch('/api/related', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: post.platform, id: post.id }),
      });
      const data = (await res.json()) as { related?: Related[] };
      setItems(data.related ?? []);
    } catch {
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={load}
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-secondary transition-colors hover:bg-elevated hover:text-fg"
      >
        <LinkIcon className="h-[14px] w-[14px]" /> {open ? '관련 숨기기' : '관련'}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-elevated/40 p-2">
          {busy && <p className="text-xs text-secondary">관련 포스트를 찾는 중…</p>}
          {!busy && items && items.length === 0 && (
            <p className="text-xs text-secondary">
              아직 관련 포스트가 없습니다. 관리에서 아카이브를 보강하면 연결이 활성화됩니다.
            </p>
          )}
          {!busy &&
            items?.map((r) => (
              <a
                key={`${r.platform}:${r.id}`}
                href={r.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md px-2 py-1.5 hover:bg-elevated"
              >
                <div className="flex items-center gap-1 text-[11px] text-secondary">
                  <span className="font-medium text-fg">@{r.username}</span>
                  <span>·</span>
                  <span>{r.platform === 'x' ? 'X' : 'Threads'}</span>
                  <span className="ml-auto tabular-nums">{Math.round(r.score * 100)}%</span>
                </div>
                <p className="line-clamp-2 text-[13px] text-fg">{r.text}</p>
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
