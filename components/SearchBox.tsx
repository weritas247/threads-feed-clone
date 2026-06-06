'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface Suggestion {
  kind: 'topic' | 'entity' | 'author' | 'tag' | 'operator';
  value: string;
  label: string;
  count?: number;
}

const lastToken = (s: string): string => {
  const m = s.match(/(\S+)$/);
  return m ? m[1] : '';
};

export function SearchBox({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initial);
  const [sugs, setSugs] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirst = useRef(true);

  // Set the raw query (operators like @author / topic:ai / #tag are parsed server-side),
  // PRESERVING any active facet filters / sort already in the URL.
  function go(value: string) {
    const sp = new URLSearchParams(params?.toString() ?? '');
    const v = value.trim();
    if (v) sp.set('q', v);
    else sp.delete('q');
    const s = sp.toString();
    router.replace(s ? `/search?${s}` : '/search');
  }

  // Live search: debounce navigation as the user types (no Enter needed).
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(q), 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Autocomplete: fetch suggestions for the current (last) token.
  useEffect(() => {
    const token = lastToken(q);
    if (token.length < 1) {
      setSugs([]);
      return;
    }
    if (sugTimer.current) clearTimeout(sugTimer.current);
    sugTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search/suggest?token=${encodeURIComponent(token)}`);
        const d = (await r.json()) as { suggestions: Suggestion[] };
        setSugs(d.suggestions ?? []);
        setOpen(true);
      } catch {
        setSugs([]);
      }
    }, 150);
    return () => {
      if (sugTimer.current) clearTimeout(sugTimer.current);
    };
  }, [q]);

  function pick(s: Suggestion) {
    // Replace the last token with the suggestion, add a trailing space, navigate now.
    const next = q.replace(/(\S+)$/, s.value) + ' ';
    setQ(next);
    setSugs([]);
    setOpen(false);
    if (timer.current) clearTimeout(timer.current);
    go(next);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
    go(q);
  }

  return (
    <form onSubmit={submit} className="relative" autoComplete="off">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => sugs.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder="검색 · @작성자 topic:ai type:tutorial state:kept #태그"
        aria-label="검색"
        autoFocus
        className="w-full rounded-lg border border-border bg-elevated px-3 py-2 pr-9 text-sm text-fg outline-none placeholder:text-secondary"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ('');
            setSugs([]);
          }}
          aria-label="검색어 지우기"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 text-lg leading-none text-secondary hover:text-fg"
        >
          ×
        </button>
      )}

      {open && sugs.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-bg py-1 shadow-lg">
          {sugs.map((s, i) => (
            <li key={`${s.kind}:${s.value}:${i}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus / fire before blur
                  pick(s);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-elevated"
              >
                <span className="min-w-0 flex-1 truncate text-fg">{s.label}</span>
                {s.count != null && <span className="text-xs text-secondary">{s.count}</span>}
                <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-secondary">{s.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
