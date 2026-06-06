'use client';

import { useState } from 'react';
import type { Post } from '@/lib/types';
import type { Collection } from '@/lib/collectionStore';
import { CollectionIcon } from './icons';

// Per-card "add to collection" affordance. Opens a small popover listing collections with
// a checkbox-like toggle, plus inline create. Lazy — fetches collections only on open.
export function AddToCollection({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [mineKeys, setMineKeys] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  async function openPopover() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (collections) return;
    const r = await fetch('/api/collections');
    const data = (await r.json()) as { collections: Collection[] };
    setCollections(data.collections);
    const key = `${post.platform}:${post.id}`;
    setMineKeys(new Set(data.collections.filter((c) => c.postKeys.includes(key)).map((c) => c.id)));
  }

  async function toggle(c: Collection) {
    const inIt = mineKeys.has(c.id);
    setBusy(true);
    try {
      await fetch('/api/collections/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: inIt ? 'remove' : 'add',
          id: c.id,
          platform: post.platform,
          postId: post.id,
        }),
      });
      setMineKeys((prev) => {
        const next = new Set(prev);
        if (inIt) next.delete(c.id);
        else next.add(c.id);
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const r = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name }),
      });
      const data = (await r.json()) as { collection: Collection; collections: Collection[] };
      setCollections(data.collections);
      setNewName('');
      await toggle(data.collection); // add the post to the new collection immediately
    } finally {
      setBusy(false);
    }
  }

  const count = mineKeys.size;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openPopover}
        className={
          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors ' +
          (count > 0
            ? 'bg-elevated text-fg'
            : 'text-secondary hover:bg-elevated hover:text-fg')
        }
      >
        <CollectionIcon className="h-[14px] w-[14px]" /> {count > 0 ? `${count}개에 담김` : '담기'}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-60 rounded-xl border border-border bg-bg p-2 shadow-lg">
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {collections && collections.length === 0 && (
              <p className="px-2 py-1 text-xs text-secondary">아직 컬렉션이 없습니다 — 아래에서 만들어 보세요.</p>
            )}
            {collections?.map((c) => {
              const on = mineKeys.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={busy}
                  onClick={() => toggle(c)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-elevated disabled:opacity-50"
                >
                  <span
                    className={
                      'flex h-4 w-4 items-center justify-center rounded border text-[10px] ' +
                      (on ? 'border-fg bg-fg text-bg' : 'border-border')
                    }
                  >
                    {on ? '✓' : ''}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-fg">{c.name}</span>
                  <span className="text-[11px] text-secondary">{c.postKeys.length}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1 border-t border-border pt-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="새 컬렉션…"
              className="min-w-0 flex-1 rounded-lg border border-border bg-elevated px-2 py-1 text-xs text-fg outline-none placeholder:text-secondary/60"
            />
            <button
              type="button"
              onClick={create}
              disabled={busy || !newName.trim()}
              className="rounded-lg bg-fg px-2 py-1 text-xs font-semibold text-bg disabled:opacity-50"
            >
              추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
