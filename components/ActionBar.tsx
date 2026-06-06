'use client';

import { useState } from 'react';
import type { Post, Stats } from '@/lib/types';
import { formatCount } from '@/lib/format';
import { HeartIcon, ReplyIcon, RepostIcon, ShareIcon, SparkleIcon } from './icons';
import { SaveButton } from './SaveButton';

function Action({ icon, count }: { icon: React.ReactNode; count: number }) {
  const label = formatCount(count);
  return (
    <button className="flex items-center gap-1 rounded-full p-2 -m-2 text-fg hover:bg-elevated" type="button">
      {icon}
      {label && <span className="text-[13px] text-fg">{label}</span>}
    </button>
  );
}

// `post` + `saved` are only passed for top-level posts (not thread replies). When
// present, the row also gets an AI summarize button (next to share) and a save toggle;
// the summary renders inline below the row.
export function ActionBar({ stats, post, saved }: { stats: Stats; post?: Post; saved?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function summarize() {
    if (!post) return;
    if (summary) {
      setOpen((o) => !o);
      return;
    }
    setBusy(true);
    setError(null);
    setOpen(true);
    try {
      const items = [post, ...post.chain].map((p) => ({
        username: p.author.username,
        platform: p.platform,
        text: p.text,
      }));
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'post', items }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? '요약에 실패했습니다.');
      else setSummary(data.summary as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mt-2 flex items-center gap-5 text-fg">
        <Action icon={<HeartIcon />} count={stats.likes} />
        <Action icon={<ReplyIcon />} count={stats.replies} />
        <Action icon={<RepostIcon />} count={stats.reposts} />
        <Action icon={<ShareIcon />} count={stats.shares} />
        {post && (
          <button
            type="button"
            onClick={summarize}
            disabled={busy}
            aria-label="포스트 요약"
            aria-pressed={open && Boolean(summary)}
            title="AI 요약"
            className="rounded-full p-2 -m-2 text-fg hover:bg-elevated disabled:opacity-50"
          >
            <SparkleIcon className={busy ? 'h-[22px] w-[22px] animate-pulse' : undefined} />
          </button>
        )}
        {post && <SaveButton post={post} initialSaved={saved} />}
      </div>
      {post && open && (error || summary) && (
        <div className="mt-2 rounded-lg border border-border bg-elevated px-3 py-2 text-[13px] leading-[1.5]">
          {error ? <span className="text-red-500">{error}</span> : <span className="text-fg">{summary}</span>}
        </div>
      )}
    </>
  );
}
