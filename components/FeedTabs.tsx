'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

const TABS: { key: string; label: string; href: string }[] = [
  { key: 'all', label: '전체', href: '/' },
  { key: 'threads', label: 'Threads', href: '/?tab=threads' },
  { key: 'x', label: 'X', href: '/?tab=x' },
  { key: 'saved', label: '저장됨', href: '/saved' },
];

// Tabs navigate to server-rendered routes. Without feedback the UI looks frozen during
// the round-trip, so we switch the active tab OPTIMISTICALLY on click and show a pending
// bar (useTransition) — the content then swaps when the server responds.
export function FeedTabs({ active }: { active: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(active);

  // Reconcile once the navigation lands (server gives the real active tab).
  useEffect(() => setOptimistic(active), [active]);

  function go(tab: (typeof TABS)[number]) {
    if (tab.key === optimistic) return;
    setOptimistic(tab.key); // instant highlight
    startTransition(() => router.push(tab.href));
  }

  return (
    <div className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
      <div className="flex">
        {TABS.map((t) => {
          const on = optimistic === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => go(t)}
              aria-current={on ? 'page' : undefined}
              className={
                'flex-1 border-b-2 py-3 text-center text-sm font-semibold transition-colors ' +
                (on ? 'border-fg text-fg' : 'border-transparent text-secondary hover:text-fg')
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {/* Indeterminate pending bar — communicates the load while the server renders. */}
      <div className="h-0.5 overflow-hidden" aria-hidden>
        {pending && <div className="h-full w-1/3 animate-[loadbar_0.9s_ease-in-out_infinite] rounded-full bg-fg/70" />}
      </div>
    </div>
  );
}
