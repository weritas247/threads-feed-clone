import Link from 'next/link';

function chip(active: boolean): string {
  return (
    'rounded-full border px-3 py-1 text-xs ' +
    (active
      ? 'border-fg bg-fg text-bg'
      : 'border-border text-secondary hover:text-fg')
  );
}

// Account-tag / VIP filter chips for the home feed. Links preserve the active platform
// tab and any active post-tag filter (`ptag`).
export function TagBar({
  tab,
  tags,
  activeTag,
  vip,
  ptag,
}: {
  tab: string;
  tags: string[];
  activeTag?: string;
  vip: boolean;
  ptag?: string;
}) {
  function href(extra: Record<string, string>): string {
    const p = new URLSearchParams();
    if (tab !== 'all') p.set('tab', tab);
    if (ptag) p.set('ptag', ptag);
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/?${s}` : '/';
  }

  return (
    <div className="flex flex-wrap gap-2 border-b border-border px-4 py-2">
      <Link href={href({})} className={chip(!activeTag && !vip)}>
        전체
      </Link>
      <Link href={href({ vip: '1' })} className={chip(vip)}>
        ★ VIP
      </Link>
      {tags.map((t) => (
        <Link key={t} href={href({ tag: t })} className={chip(activeTag === t)}>
          #{t}
        </Link>
      ))}
    </div>
  );
}
