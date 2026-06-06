'use client';

import { useEffect, useState } from 'react';

// "Generate week-in-review" — sends the window to /api/digest and renders the AI digest.
// Quiet when no provider is configured (the page still shows stats + posts).
export function DigestClient({ days }: { days: number }) {
  const [hasProvider, setHasProvider] = useState(true);
  const [busy, setBusy] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/summarize')
      .then((r) => r.json())
      .then((d: { providers?: string[] }) => setHasProvider((d.providers ?? []).length > 0))
      .catch(() => setHasProvider(false));
  }, []);

  async function generate() {
    setBusy(true);
    setError(null);
    setDigest(null);
    try {
      const r = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      const data = (await r.json()) as { digest?: string; error?: string };
      if (!r.ok || data.error) setError(data.error ?? '다이제스트 생성에 실패했습니다.');
      else setDigest(data.digest ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-border px-4 py-3">
      <button
        type="button"
        onClick={generate}
        disabled={busy || !hasProvider}
        title={hasProvider ? undefined : 'ANTHROPIC_API_KEY 또는 GEMINI_API_KEY를 설정하면 활성화됩니다'}
        className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-50"
      >
        {busy ? '작성 중…' : '✨ 주간 리뷰'}
      </button>
      {!hasProvider && <span className="ml-2 text-xs text-secondary">API 키를 설정하면 활성화됩니다.</span>}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {digest && (
        <div className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-elevated px-4 py-3 text-[14px] leading-[1.6] text-fg">
          {digest}
        </div>
      )}
    </div>
  );
}
