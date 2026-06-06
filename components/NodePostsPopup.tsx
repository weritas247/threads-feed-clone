'use client';

import { useEffect, useState } from 'react';
import { relativeTime, formatCount } from '@/lib/format';
import { AccountIcon } from './AccountIcon';

type PopupPost = {
  id: string;
  platform: 'threads' | 'x';
  permalink: string;
  text: string;
  createdAt: number;
  author: { username: string; displayName: string; avatarUrl: string; verified: boolean };
  stats: { likes: number; replies: number; reposts: number; shares: number };
  mediaCount: number;
};

// A lightweight modal that previews the posts behind a graph node (a topic or entity).
// Each post links to its source original; the header links to the full hub feed. Closes on
// backdrop click or Esc.
export function NodePostsPopup({
  kind,
  id,
  hubHref,
  onClose,
}: {
  kind: 'topic' | 'entity';
  id: string;
  hubHref: string;
  onClose: () => void;
}) {
  const [posts, setPosts] = useState<PopupPost[] | null>(null);

  useEffect(() => {
    let alive = true;
    setPosts(null);
    fetch(`/api/node-posts?kind=${kind}&id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setPosts(d.posts ?? []);
      })
      .catch(() => {
        if (alive) setPosts([]);
      });
    return () => {
      alive = false;
    };
  }, [kind, id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    // Capture so this fires before the graph's own Esc handler (which would zoom out).
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-fg">{id}</h2>
            <p className="text-xs text-secondary">
              {kind === 'entity' ? '엔티티' : '토픽'} · {posts ? `포스트 ${posts.length}개` : '불러오는 중…'}
            </p>
          </div>
          <a
            href={hubHref}
            className="ml-auto flex-none rounded-full bg-elevated px-3 py-1.5 text-xs font-medium text-fg hover:bg-border"
          >
            전체 피드 →
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex-none rounded-full px-2 py-1.5 text-secondary hover:bg-elevated hover:text-fg"
          >
            ✕
          </button>
        </header>

        <div className="overflow-y-auto">
          {posts === null ? (
            <p className="py-16 text-center text-sm text-secondary">불러오는 중…</p>
          ) : posts.length === 0 ? (
            <p className="py-16 text-center text-sm text-secondary">표시할 포스트가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-border">
              {posts.map((p) => (
                <li key={`${p.platform}:${p.id}`} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AccountIcon src={p.author.avatarUrl} username={p.author.username} size={24} />
                    <span className="truncate text-sm font-medium text-fg">
                      {p.author.displayName || p.author.username}
                    </span>
                    <span className="truncate text-xs text-secondary">@{p.author.username}</span>
                    <span className="ml-auto flex-none rounded bg-elevated px-1.5 py-0.5 text-[11px] text-secondary">
                      {p.platform === 'x' ? 'X' : 'Threads'}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-fg/90 line-clamp-4">{p.text}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-secondary">
                    <span>{relativeTime(p.createdAt)}</span>
                    <span>♥ {formatCount(p.stats.likes)}</span>
                    {p.mediaCount > 0 && <span>미디어 {p.mediaCount}</span>}
                    <a
                      href={p.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto font-medium text-fg hover:underline"
                    >
                      원본 열기 ↗
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
