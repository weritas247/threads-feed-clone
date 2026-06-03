'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBox({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  }

  return (
    <form onSubmit={submit}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search posts and accounts"
        aria-label="Search"
        autoFocus
        className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-fg outline-none placeholder:text-secondary"
      />
    </form>
  );
}
