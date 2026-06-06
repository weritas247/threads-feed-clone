'use client';

import { useEffect, useState } from 'react';

// Header actions for a collection: synthesize the posts into a saved Markdown note (AI),
// and export the collection as a Markdown / Obsidian file. The saved note renders inline.
export function CollectionDetail({
  id,
  initialNote,
  postCount,
}: {
  id: string;
  initialNote: string;
  postCount: number;
}) {
  const [note, setNote] = useState(initialNote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState(true);

  useEffect(() => {
    fetch('/api/summarize')
      .then((r) => r.json())
      .then((d: { providers?: string[] }) => setHasProvider((d.providers ?? []).length > 0))
      .catch(() => setHasProvider(false));
  }, []);

  async function synthesize() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/collections/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = (await r.json()) as { note?: string; error?: string };
      if (!r.ok || data.error) setError(data.error ?? '정리에 실패했습니다.');
      else if (data.note) setNote(data.note);
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  if (postCount === 0) return null;

  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={synthesize}
          disabled={busy || !hasProvider}
          title={hasProvider ? undefined : 'ANTHROPIC_API_KEY 또는 GEMINI_API_KEY를 설정하면 활성화됩니다'}
          className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {busy ? '정리 중…' : note ? '↻ 다시 정리' : '✨ 정리 노트'}
        </button>
        <a
          href={`/api/collections/export?id=${encodeURIComponent(id)}&format=md`}
          className="rounded-full border border-border px-3 py-1.5 text-sm text-fg hover:bg-elevated"
        >
          ⬇ Markdown
        </a>
        <a
          href={`/api/collections/export?id=${encodeURIComponent(id)}&format=obsidian`}
          className="rounded-full border border-border px-3 py-1.5 text-sm text-fg hover:bg-elevated"
        >
          ⬇ Obsidian
        </a>
        {!hasProvider && (
          <span className="text-xs text-secondary">정리하려면 API 키를 설정하세요.</span>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {note && (
        <div className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-elevated px-4 py-3 text-[14px] leading-[1.6] text-fg">
          {note}
        </div>
      )}
    </div>
  );
}
