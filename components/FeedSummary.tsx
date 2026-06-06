'use client';

import { useEffect, useState } from 'react';
import type { AiProvider } from '@/lib/ai/types';
import type { Post } from '@/lib/types';

const LABEL: Record<AiProvider, string> = { claude: 'Claude', gemini: 'Gemini' };

type Result = { summary: string; provider: AiProvider; model: string; count: number };

// "Summarize this feed" panel. Sends the feed's own posts to /api/summarize and renders
// the AI summary, so it works on any feed (home, per-account, saved, search). Provider
// (Claude / Gemini) is chosen from whichever have an API key configured server-side.
export function FeedSummary({ posts }: { posts: Post[] }) {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [provider, setProvider] = useState<AiProvider | ''>('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/summarize')
      .then((r) => r.json())
      .then((d: { providers?: AiProvider[] }) => {
        const list = d.providers ?? [];
        setProviders(list);
        setProvider(list[0] ?? '');
      })
      .catch(() => setProviders([]));
  }, []);

  // The component instance is reused across client-side navigations (Next keeps it
  // mounted at the same tree position), so a summary from one feed would otherwise
  // linger on the next. Tie the summary to the current feed: whenever the post set
  // changes (navigation, tab switch, tag filter), discard the previous result.
  const feedSig = `${posts.length}:${posts[0]?.id ?? ''}:${posts[posts.length - 1]?.id ?? ''}`;
  useEffect(() => {
    setResult(null);
    setError(null);
    setOpen(false);
  }, [feedSig]);

  async function summarize() {
    setBusy(true);
    setError(null);
    setResult(null);
    setOpen(true);
    try {
      const items = posts
        .slice(0, 40)
        .map((p) => ({ username: p.author.username, platform: p.platform, text: p.text }));
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, provider: provider || undefined }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? '요약에 실패했습니다.');
      else setResult(data as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  const noKeys = providers.length === 0;

  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={summarize}
          disabled={busy || noKeys}
          className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-50"
          title={noKeys ? 'ANTHROPIC_API_KEY 또는 GEMINI_API_KEY를 설정하면 활성화됩니다' : undefined}
        >
          {busy ? '요약 중…' : '✨ 피드 요약'}
        </button>
        {providers.length > 1 && (
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AiProvider)}
            aria-label="AI 제공자"
            className="rounded-lg border border-border bg-elevated px-2 py-1.5 text-sm text-fg outline-none"
          >
            {providers.map((p) => (
              <option key={p} value={p}>
                {LABEL[p]}
              </option>
            ))}
          </select>
        )}
        {noKeys && (
          <span className="text-xs text-secondary">
            <code className="rounded bg-elevated px-1">ANTHROPIC_API_KEY</code> 또는{' '}
            <code className="rounded bg-elevated px-1">GEMINI_API_KEY</code>를 설정하면 활성화됩니다.
          </span>
        )}
        {open && (result || error) && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-auto rounded-md border border-border px-2 py-1 text-xs text-secondary"
          >
            숨기기
          </button>
        )}
      </div>

      {open && (error || result) && (
        <div className="mt-3 rounded-xl border border-border bg-elevated px-3 py-2 text-sm">
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : result ? (
            <>
              <p className="whitespace-pre-wrap leading-[1.5] text-fg">{result.summary}</p>
              <p className="mt-2 text-[11px] text-secondary">
                {LABEL[result.provider]} · {result.model} · 게시물 {result.count}개
              </p>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
