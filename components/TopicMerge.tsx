'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Fold the active topic into another (synonym merge), archive-wide. Human-in-the-loop
// cleanup for the auto-extracted topic vocabulary. On success, navigates to the target.
export function TopicMerge({ topic }: { topic: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function merge() {
    const target = to.trim().toLowerCase();
    if (!target || target === topic) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/posts/enrichment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'merge', from: topic, to: target }),
      });
      const data = (await r.json()) as { changed?: number };
      setMsg(`게시물 ${data.changed ?? 0}개를 “${target}”(으)로 병합했습니다.`);
      router.push(`/topics?t=${encodeURIComponent(target)}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-secondary hover:text-fg"
        title="이 토픽을 다른 토픽에 합치기 (동의어 병합)"
      >
        ⤳ 병합
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs text-secondary">“{topic}” 병합 →</span>
      <input
        autoFocus
        value={to}
        onChange={(e) => setTo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') merge();
          else if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="대상 토픽"
        className="w-32 rounded-full border border-border bg-elevated px-2 py-0.5 text-xs text-fg outline-none"
      />
      <button
        type="button"
        onClick={merge}
        disabled={busy || !to.trim()}
        className="rounded-full bg-fg px-2 py-0.5 text-xs font-semibold text-bg disabled:opacity-50"
      >
        {busy ? '…' : '병합'}
      </button>
      {msg && <span className="text-xs text-secondary">{msg}</span>}
    </span>
  );
}
