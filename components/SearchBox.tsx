'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function SearchBox({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirst = useRef(true);

  function go(value: string) {
    const v = value.trim();
    // A leading # searches post tags instead of text.
    if (v.startsWith('#')) {
      const t = v.slice(1).trim().toLowerCase();
      router.replace(t ? `/search?tag=${encodeURIComponent(t)}` : '/search');
      return;
    }
    router.replace(v ? `/search?q=${encodeURIComponent(v)}` : '/search');
  }

  // Live search: debounce navigation as the user types (no Enter needed).
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(q), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    go(q); // immediate on Enter
  }

  return (
    <form onSubmit={submit} className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search posts, accounts, or #tags"
        aria-label="Search"
        autoFocus
        className="w-full rounded-lg border border-border bg-elevated px-3 py-2 pr-9 text-sm text-fg outline-none placeholder:text-secondary"
      />
      {q && (
        <button
          type="button"
          onClick={() => setQ('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 text-lg leading-none text-secondary hover:text-fg"
        >
          ×
        </button>
      )}
    </form>
  );
}
