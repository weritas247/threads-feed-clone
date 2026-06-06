'use client';

import { useState } from 'react';

interface Source {
  username: string;
  platform: 'threads' | 'x';
  permalink: string;
  text: string;
  score: number;
}
interface AskResponse {
  answer?: string;
  sources?: Source[];
  note?: string;
  error?: string;
  provider?: string;
  model?: string;
}

// Ask-my-archive: a question → a synthesized, cited answer drawn ONLY from the user's own
// posts (retrieval + RAG). With no AI key it still retrieves and lists the top sources.
export function AskClient() {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<AskResponse | null>(null);

  async function ask() {
    const question = q.trim();
    if (!question) return;
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      setRes((await r.json()) as AskResponse);
    } catch (e) {
      setRes({ error: e instanceof Error ? e.message : '요청에 실패했습니다.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-bold text-fg">아카이브에 질문하기</h1>
      <p className="text-sm text-secondary">
        답변은 저장한 게시물에서만, 출처와 함께 제공됩니다. 검색할 내용이 생기도록 먼저
        계정 관리에서 아카이브를 보강하세요.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="e.g. 어떤 AI 에이전트 도구가 추천됐지?"
          className="flex-1 rounded-full border border-border bg-elevated px-4 py-2 text-sm text-fg outline-none placeholder:text-secondary/60"
        />
        <button
          type="button"
          onClick={ask}
          disabled={busy || !q.trim()}
          className="rounded-full bg-fg px-5 py-2 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {busy ? '생각 중…' : '질문'}
        </button>
      </div>

      {res && (
        <div className="mt-4 space-y-3 pb-8">
          {res.error && <p className="text-sm text-red-500">{res.error}</p>}
          {res.note && <p className="text-sm text-secondary">{res.note}</p>}
          {res.answer && (
            <div className="rounded-xl border border-border bg-elevated px-4 py-3">
              <p className="whitespace-pre-wrap text-[15px] leading-[1.6] text-fg">{res.answer}</p>
              {res.provider && (
                <p className="mt-2 text-[11px] text-secondary">
                  {res.provider} · {res.model} · 게시물 {res.sources?.length ?? 0}개 기반
                </p>
              )}
            </div>
          )}
          {res.sources && res.sources.length > 0 && (
            <div>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-secondary">
                출처
              </h2>
              <ol className="space-y-1.5">
                {res.sources.map((s, i) => (
                  <li key={`${s.platform}:${i}`} className="flex gap-2 text-sm">
                    <span className="text-secondary tabular-nums">[{i + 1}]</span>
                    <a
                      href={s.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 rounded-lg px-2 py-1 hover:bg-elevated"
                    >
                      <span className="text-[11px] text-secondary">
                        @{s.username} · {s.platform === 'x' ? 'X' : 'Threads'} ·{' '}
                        {Math.round(s.score * 100)}%
                      </span>
                      <p className="line-clamp-2 text-fg">{s.text}</p>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
