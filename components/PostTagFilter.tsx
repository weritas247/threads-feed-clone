import Link from 'next/link';

function chip(active: boolean): string {
  return (
    'rounded-full border px-3 py-1 text-xs ' +
    (active ? 'border-fg bg-fg text-bg' : 'border-border text-secondary hover:text-fg')
  );
}

// Post-tag filter bar for an aggregated feed (home, saved). Each chip toggles its tag
// in the `ptag` URL param (multi-select = AND), preserving any other params already on
// the page. Distinct from the account-tag TagBar; shown only when post tags exist.
export function PostTagFilter({
  basePath,
  params,
  tags,
  selected,
}: {
  basePath: string;
  params: Record<string, string>;
  tags: string[];
  selected: string[];
}) {
  if (tags.length === 0) return null;
  const sel = new Set(selected);

  function href(next: string[]): string {
    const p = new URLSearchParams(params);
    p.delete('ptag');
    if (next.length) p.set('ptag', next.join(','));
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
      <span className="mr-1 text-xs font-medium text-secondary">태그로 필터</span>
      {tags.map((t) => {
        const on = sel.has(t);
        const next = on ? selected.filter((x) => x !== t) : [...selected, t];
        return (
          <Link key={t} href={href(next)} className={chip(on)}>
            #{t}
          </Link>
        );
      })}
      {selected.length > 0 && (
        <Link
          href={href([])}
          className="rounded-full px-2 py-1 text-xs text-secondary underline hover:text-fg"
        >
          초기화
        </Link>
      )}
    </div>
  );
}
