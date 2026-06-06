'use client';

import { useState } from 'react';
import type { Post } from '@/lib/types';
import type { CaptureState } from '@/lib/captureStateStore';

// Quiet triage row: move a captured post through inbox → kept / archived / discarded.
// This is the core "use loop" — new captures default to inbox; a click promotes or drops
// them. Persists to captureStateStore (survives re-crawls).
const OPTIONS: { state: CaptureState; label: string; title: string }[] = [
  { state: 'kept', label: '✓ 킵', title: '간직할 가치가 있음 — 지식 베이스로 승격' },
  { state: 'archived', label: '🗄 보관', title: '간직하되 눈에 띄지 않게' },
  { state: 'discarded', label: '✕ 버림', title: '노이즈 — 버리기' },
];

const STATE_LABELS: Record<CaptureState, string> = {
  inbox: '받은함',
  kept: '킵',
  archived: '보관',
  discarded: '버림',
};

export function TriageControls({ post, initialState = 'inbox' }: { post: Post; initialState?: CaptureState }) {
  const [state, setState] = useState<CaptureState>(initialState);
  const [busy, setBusy] = useState(false);

  async function set(next: CaptureState) {
    const target = state === next ? 'inbox' : next; // click active → back to inbox
    setBusy(true);
    try {
      const res = await fetch('/api/posts/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: post.platform, id: post.id, state: target }),
      });
      if (res.ok) setState(((await res.json()) as { state: CaptureState }).state);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex items-center gap-1.5">
      {state !== 'inbox' && (
        <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] text-secondary">{STATE_LABELS[state]}</span>
      )}
      {OPTIONS.map((o) => {
        const on = state === o.state;
        return (
          <button
            key={o.state}
            type="button"
            disabled={busy}
            onClick={() => set(o.state)}
            title={o.title}
            className={
              'rounded-full px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ' +
              (on ? 'bg-fg font-medium text-bg' : 'text-secondary hover:bg-elevated hover:text-fg')
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
