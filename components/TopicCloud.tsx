'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

// Scalable topic browser: a flat sorted chip wall doesn't scale past ~30 topics, so this
// adds search, sort (popularity / name), a collapse for the single-post long tail, and a
// size/weight hierarchy by post count — the meaningful topics actually stand out.
function sizeCls(count: number): string {
  if (count >= 5) return 'text-[15px] font-semibold';
  if (count >= 3) return 'text-sm font-medium';
  if (count >= 2) return 'text-[13px]';
  return 'text-xs';
}

export function TopicCloud({
  topics,
  active,
  basePath = '/topics',
  param = 't',
}: {
  topics: Array<{ topic: string; count: number }>;
  active?: string;
  basePath?: string;
  param?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'count' | 'name'>('count');
  const [hideSingles, setHideSingles] = useState(topics.length > 30);

  const singles = topics.filter((t) => t.count === 1).length;
  const query = q.trim().toLowerCase();

  const shown = useMemo(() => {
    let list = topics;
    if (query) list = list.filter((t) => t.topic.includes(query));
    else if (hideSingles) list = list.filter((t) => t.count > 1);
    return [...list].sort((a, b) =>
      sort === 'name' ? a.topic.localeCompare(b.topic) : b.count - a.count || a.topic.localeCompare(b.topic),
    );
  }, [topics, query, hideSingles, sort]);

  const SortBtn = ({ k, label }: { k: 'count' | 'name'; label: string }) => (
    <button
      type="button"
      onClick={() => setSort(k)}
      className={'rounded-full px-2.5 py-1 ' + (sort === k ? 'bg-elevated font-medium text-fg' : 'text-secondary hover:text-fg')}
    >
      {label}
    </button>
  );

  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="토픽 검색…"
          className="min-w-0 flex-1 rounded-full border border-border bg-elevated px-3 py-1.5 text-sm text-fg outline-none placeholder:text-secondary/60"
        />
        <div className="flex gap-0.5 text-xs">
          <SortBtn k="count" label="인기순" />
          <SortBtn k="name" label="이름순" />
        </div>
      </div>

      {singles > 0 && !query && (
        <button
          type="button"
          onClick={() => setHideSingles((h) => !h)}
          className="mt-2 text-xs text-secondary hover:text-fg"
        >
          {hideSingles ? `단발 토픽 ${singles}개 더 보기 ▾` : `단발 토픽 ${singles}개 접기 ▴`}
        </button>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {shown.map((t) => {
          const on = active === t.topic;
          return (
            <button
              key={t.topic}
              type="button"
              onClick={() => router.push(`${basePath}?${param}=${encodeURIComponent(t.topic)}`)}
              className={
                'rounded-full border px-3 py-1 transition-colors ' +
                sizeCls(t.count) +
                ' ' +
                (on ? 'border-fg bg-fg text-bg' : 'border-border text-secondary hover:text-fg')
              }
            >
              {t.topic} <span className="opacity-60">{t.count}</span>
            </button>
          );
        })}
        {shown.length === 0 && <p className="py-2 text-sm text-secondary">검색 결과가 없습니다.</p>}
      </div>
    </div>
  );
}
