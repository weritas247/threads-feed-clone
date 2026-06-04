import Link from 'next/link';

function chip(active: boolean): string {
  return (
    'rounded-full border px-3 py-1 text-xs ' +
    (active
      ? 'border-fg bg-fg text-bg'
      : 'border-border text-secondary hover:text-fg')
  );
}

// Tag/VIP filter chips for the home feed. Links preserve the active platform tab.
export function TagBar({
  tab,
  tags,
  activeTag,
  vip,
}: {
  tab: string;
  tags: string[];
  activeTag?: string;
  vip: boolean;
}) {
  function href(extra: Record<string, string>): string {
    const p = new URLSearchParams();
    if (tab !== 'all') p.set('tab', tab);
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/?${s}` : '/';
  }

  return (
    <div className="flex flex-wrap gap-2 border-b border-border px-4 py-2">
      <Link href={href({})} className={chip(!activeTag && !vip)}>
        All
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
