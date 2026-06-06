'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  MessageCircleQuestion,
  Inbox,
  Newspaper,
  Clock,
  Hash,
  Boxes,
  Network,
  Library,
  BarChart3,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

// 좌측 세로 네비게이션 사이드바. 현재 경로를 활성 표시한다(usePathname). 아이콘은 Lucide.
const NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/', label: '홈', icon: Home },
  { href: '/ask', label: '질문', icon: MessageCircleQuestion },
  { href: '/inbox', label: '받은함', icon: Inbox },
  { href: '/digest', label: '다이제스트', icon: Newspaper },
  { href: '/timeline', label: '타임라인', icon: Clock },
  { href: '/topics', label: '토픽', icon: Hash },
  { href: '/entities', label: '엔티티', icon: Boxes },
  { href: '/graph', label: '그래프', icon: Network },
  { href: '/collections', label: '컬렉션', icon: Library },
  { href: '/stats', label: '통계', icon: BarChart3 },
  { href: '/search', label: '검색', icon: Search },
  { href: '/manage', label: '관리', icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function Sidebar() {
  const pathname = usePathname() ?? '/';
  return (
    <aside className="sticky top-0 flex h-screen w-16 flex-none flex-col border-r border-border bg-bg/80 backdrop-blur sm:w-44">
      <Link
        href="/"
        className="flex items-center justify-center px-3 py-4 text-lg font-bold text-fg sm:justify-start"
        title="Threads"
      >
        <span className="sm:hidden">T</span>
        <span className="hidden sm:inline">Threads</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={
                'flex items-center justify-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors sm:justify-start ' +
                (active ? 'bg-elevated font-semibold text-fg' : 'text-secondary hover:bg-elevated hover:text-fg')
              }
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} className="flex-none" aria-hidden />
              <span className="hidden truncate sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-center border-t border-border px-2 py-3 sm:justify-start sm:px-3">
        <ThemeToggle />
      </div>
    </aside>
  );
}
