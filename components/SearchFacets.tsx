import Link from 'next/link';
import type { Facets } from '@/lib/searchQuery';

// Faceted filter chips. Each value is a Link that toggles its URL param (click an active
// one to remove it); counts come from the current result set. Server component — no JS.

const TYPE_LABEL: Record<string, string> = {
  tutorial: '튜토리얼', news: '뉴스', opinion: '의견', launch: '출시', thread: '스레드', resource: '자료', other: '기타',
};
const STATE_LABEL: Record<string, string> = { inbox: '받은함', kept: '킵', archived: '보관', discarded: '버림' };

type Params = Record<string, string | undefined>;

function qs(params: Params): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `/search?${s}` : '/search';
}

function toggle(params: Params, key: string, value: string): Params {
  return { ...params, [key]: params[key] === value ? undefined : value };
}

export function SearchFacets({ params, facets }: { params: Params; facets: Facets }) {
  function Group({
    title,
    groupKey,
    items,
    labelOf,
  }: {
    title: string;
    groupKey: string;
    items: Array<{ value: string; count: number }>;
    labelOf?: (v: string) => string;
  }) {
    if (items.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-12 flex-none text-[11px] text-secondary">{title}</span>
        {items.map((it) => {
          const active = params[groupKey] === it.value;
          return (
            <Link
              key={it.value}
              href={qs(toggle(params, groupKey, it.value))}
              className={
                'rounded-full border px-2.5 py-0.5 text-xs ' +
                (active ? 'border-fg bg-fg text-bg' : 'border-border text-secondary hover:text-fg')
              }
            >
              {labelOf ? labelOf(it.value) : it.value} <span className="opacity-60">{it.count}</span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 border-b border-border px-4 py-2.5">
      <Group title="플랫폼" groupKey="platform" items={facets.platforms} labelOf={(v) => (v === 'x' ? 'X' : 'Threads')} />
      <Group title="유형" groupKey="type" items={facets.types} labelOf={(v) => TYPE_LABEL[v] ?? v} />
      <Group title="분류" groupKey="state" items={facets.states} labelOf={(v) => STATE_LABEL[v] ?? v} />
      <Group title="토픽" groupKey="topic" items={facets.topics} />
      <Group title="엔티티" groupKey="entity" items={facets.entities} />
      <Group title="작성자" groupKey="author" items={facets.authors} labelOf={(v) => '@' + v} />
    </div>
  );
}
