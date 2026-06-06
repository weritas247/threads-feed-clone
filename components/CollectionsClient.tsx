'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Collection } from '@/lib/collectionStore';
import { relativeTime } from '@/lib/format';

// Manage collections: create, rename (inline), delete. Detail/synthesis/export live on
// /collections/[id]. State is the server list, refreshed from each mutation's response.
export function CollectionsClient({ initial }: { initial: Collection[] }) {
  const [collections, setCollections] = useState<Collection[]>(initial);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await r.json()) as { collections?: Collection[] };
      if (data.collections) setCollections(data.collections);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 py-4">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              post({ action: 'create', name });
              setName('');
            }
          }}
          placeholder="새 컬렉션 이름…"
          className="flex-1 rounded-full border border-border bg-elevated px-4 py-2 text-sm text-fg outline-none placeholder:text-secondary/60"
        />
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => {
            post({ action: 'create', name });
            setName('');
          }}
          className="rounded-full bg-fg px-5 py-2 text-sm font-semibold text-bg disabled:opacity-50"
        >
          만들기
        </button>
      </div>

      {collections.length === 0 ? (
        <p className="py-16 text-center text-secondary">
          아직 컬렉션이 없습니다. 하나 만든 뒤, 피드의 “담기” 버튼으로 게시물을 추가하세요.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {collections.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              {editId === c.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      post({ action: 'rename', id: c.id, name: editName });
                      setEditId(null);
                    } else if (e.key === 'Escape') setEditId(null);
                  }}
                  className="flex-1 rounded-lg border border-border bg-elevated px-2 py-1 text-sm text-fg outline-none"
                />
              ) : (
                <Link href={`/collections/${c.id}`} className="min-w-0 flex-1">
                  <span className="font-medium text-fg hover:underline">
                    {c.query && '🔍 '}
                    {c.name}
                  </span>
                  <span className="ml-2 text-xs text-secondary">
                    {c.query ? '저장된 검색' : `게시물 ${c.postKeys.length}개`} · {relativeTime(c.createdAt)}
                    {c.note ? ' · 정리됨' : ''}
                  </span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditId(c.id);
                  setEditName(c.name);
                }}
                className="text-xs text-secondary hover:text-fg"
              >
                이름 변경
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`“${c.name}”을(를) 삭제할까요?`)) post({ action: 'delete', id: c.id });
                }}
                className="text-xs text-red-500/80 hover:text-red-500"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
