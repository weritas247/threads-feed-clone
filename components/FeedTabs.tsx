import Link from 'next/link';

const TABS: { key: string; label: string; href: string }[] = [
  { key: 'all', label: '전체', href: '/' },
  { key: 'threads', label: 'Threads', href: '/?tab=threads' },
  { key: 'x', label: 'X', href: '/?tab=x' },
  { key: 'saved', label: '저장됨', href: '/saved' },
];

export function FeedTabs({ active }: { active: string }) {
  return (
    <div className="sticky top-0 z-10 flex border-b border-border bg-bg/95 backdrop-blur">
      {TABS.map((t) => {
        const on = active === t.key;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={
              'flex-1 border-b-2 py-3 text-center text-sm font-semibold transition-colors ' +
              (on ? 'border-fg text-fg' : 'border-transparent text-secondary hover:text-fg')
            }
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
