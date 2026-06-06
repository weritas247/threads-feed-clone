import type { Post } from './types';

// Helpers for the "week in review" digest. Pure + deterministic (caller supplies `now`).

export const DAY = 86_400; // seconds

// Posts created within the last `days` before `now`, newest first.
export function postsInWindow(posts: Post[], now: number, days: number): Post[] {
  const since = now - days * DAY;
  return posts
    .filter((p) => p.createdAt >= since && p.createdAt <= now)
    .sort((a, b) => b.createdAt - a.createdAt);
}

// A compact set of facts about the window, for the digest header (no AI needed).
export interface DigestStats {
  count: number;
  days: number;
  authors: number;
  byPlatform: { threads: number; x: number };
  topAuthors: Array<{ username: string; count: number }>;
}

export function digestStats(posts: Post[], days: number): DigestStats {
  const byPlatform = { threads: 0, x: 0 };
  const authorCounts: Record<string, number> = {};
  for (const p of posts) {
    byPlatform[p.platform]++;
    authorCounts[p.author.username] = (authorCounts[p.author.username] ?? 0) + 1;
  }
  const topAuthors = Object.entries(authorCounts)
    .map(([username, count]) => ({ username, count }))
    .sort((a, b) => b.count - a.count || a.username.localeCompare(b.username))
    .slice(0, 5);
  return { count: posts.length, days, authors: Object.keys(authorCounts).length, byPlatform, topAuthors };
}
