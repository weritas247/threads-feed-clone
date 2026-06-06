'use client';

import { useState } from 'react';

// Saves the current search (query + filters, as a URL param string) as a SMART collection
// that auto-updates. Shown on /search when there's something to save.
export function SaveSearchButton({ query, suggestedName }: { query: string; suggestedName: string }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    const name = window.prompt('저장된 검색 이름', suggestedName || '저장된 검색');
    if (name == null) return;
    setBusy(true);
    try {
      const r = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name, query }),
      });
      if (r.ok) setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    return <span className="text-xs text-secondary">✓ 컬렉션에 저장됨</span>;
  }
  return (
    <button
      type="button"
      onClick={save}
      disabled={busy}
      className="text-xs text-secondary hover:text-fg disabled:opacity-50"
      title="이 검색을 스마트 컬렉션으로 저장"
    >
      ☆ 검색 저장
    </button>
  );
}
