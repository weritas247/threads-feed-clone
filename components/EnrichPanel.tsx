'use client';

import { useEffect, useState } from 'react';

interface Status {
  total: number;
  enriched: number;
  embedded: number;
  pendingEnrich: number;
  pendingEmbed: number;
  enricher: { provider: string; model: string; promptVersion: string };
  embedder: { id: string; dim: number };
}
interface RunResult {
  enriched: number;
  enrichFailed: number;
  embedded: number;
  remaining: number;
}

// "Datafy" control: runs the enrichment + embedding pipeline over the archive in bounded
// batches, looping until drained. This is what powers Topics, semantic search, Related,
// and Ask — nothing structured exists until this runs. Decoupled from crawl on purpose.
export function EnrichPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string>('');

  async function refresh() {
    try {
      const r = await fetch('/api/enrich');
      setStatus((await r.json()) as Status);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function run() {
    setBusy(true);
    setLog('시작하는 중…');
    try {
      // Loop batches until nothing remains (or a batch makes no progress).
      for (let i = 0; i < 50; i++) {
        const r = await fetch('/api/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 25 }),
        });
        if (!r.ok) {
          const e = (await r.json()) as { error?: string };
          setLog(`오류: ${e.error ?? r.status}`);
          break;
        }
        const res = (await r.json()) as RunResult;
        setLog(
          `배치 ${i + 1}: 보강 +${res.enriched}, 임베딩 +${res.embedded}` +
            (res.enrichFailed ? `, 실패 ${res.enrichFailed}` : '') +
            ` · ${res.remaining}개 남음`,
        );
        await refresh();
        if (res.remaining === 0 || res.enriched + res.embedded === 0) break;
      }
      setLog((l) => l + ' — 완료.');
    } finally {
      setBusy(false);
    }
  }

  const pending = status ? Math.max(status.pendingEnrich, status.pendingEmbed) : 0;
  const pct = status && status.total > 0 ? Math.round((status.enriched / status.total) * 100) : 0;

  return (
    <div className="mx-4 mb-2 mt-4 rounded-xl border border-border bg-elevated/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={busy || pending === 0}
          className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {busy ? '보강 중…' : pending === 0 ? '아카이브 보강 완료' : `아카이브 보강 (${pending})`}
        </button>
        {status && (
          <span className="text-xs text-secondary">
            보강 {status.enriched}/{status.total} ({pct}%) · 임베딩 {status.embedded}/{status.total}
          </span>
        )}
      </div>
      {status && (
        <p className="mt-2 text-[11px] text-secondary">
          보강기: {status.enricher.provider}/{status.enricher.model} · 임베더:{' '}
          {status.embedder.id} ({status.embedder.dim}d)
          {status.enricher.model === 'local-heuristic' && ' — 더 풍부한 추출을 위해 API 키를 설정하세요'}
        </p>
      )}
      {log && <p className="mt-1 text-[11px] text-secondary">{log}</p>}
    </div>
  );
}
