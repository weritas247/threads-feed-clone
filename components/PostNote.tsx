'use client';

import { useState } from 'react';
import type { Post } from '@/lib/types';
import { NoteIcon } from './icons';

// Per-post free-text memo. Quiet "Note" affordance when empty; shows the saved memo in a
// left-bordered box otherwise. Persists in postNoteStore (survives re-crawls) and is
// included in search. Multi-line; ⌘/Ctrl+Enter or Save commits, Esc cancels.
export function PostNote({ post, initialNote = '' }: { post: Post; initialNote?: string }) {
  const [note, setNote] = useState(initialNote);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialNote);
  const [busy, setBusy] = useState(false);

  async function save() {
    const text = draft.trim();
    setBusy(true);
    try {
      const res = await fetch('/api/posts/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: post.platform, id: post.id, note: text }),
      });
      if (res.ok) {
        setNote(((await res.json()) as { note: string }).note);
        setEditing(false);
      }
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    setDraft(note);
    setEditing(true);
  }

  if (editing) {
    return (
      <div className="mt-2">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
            else if (e.key === 'Escape') setEditing(false);
          }}
          placeholder="비공개 메모 추가…"
          rows={2}
          className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-[13px] text-fg outline-none placeholder:text-secondary/60"
        />
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-full bg-fg px-3 py-1 text-xs font-semibold text-bg disabled:opacity-50"
          >
            {busy ? '저장 중…' : '저장'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-full px-2 py-1 text-xs text-secondary hover:text-fg"
          >
            취소
          </button>
          <span className="text-[11px] text-secondary/60">⌘↵ 로 저장</span>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <button
        type="button"
        onClick={startEdit}
        className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-secondary transition-colors hover:bg-elevated hover:text-fg"
      >
        <NoteIcon className="h-[15px] w-[15px]" /> 메모
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      title="메모 편집"
      className="mt-2 block w-full rounded-lg border-l-2 border-fg/40 bg-elevated px-3 py-2 text-left text-[13px] leading-[1.5] text-fg hover:bg-elevated/70"
    >
      <span className="whitespace-pre-wrap break-words">{note}</span>
    </button>
  );
}
