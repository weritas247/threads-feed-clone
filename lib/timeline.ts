import type { Post } from './types';

// The time axis the archive was missing. Pure helpers (UTC-based, deterministic) so they
// unit-test cleanly; the page supplies `now` for "on this day".

const dayKey = (unixSec: number): string => new Date(unixSec * 1000).toISOString().slice(0, 10);
const monthDay = (unixSec: number): string => new Date(unixSec * 1000).toISOString().slice(5, 10); // MM-DD

export interface DayBucket {
  day: string; // YYYY-MM-DD
  count: number;
}

// Posts per day, newest day first — for an activity strip / sparkline.
export function activityByDay(posts: Post[]): DayBucket[] {
  const counts: Record<string, number> = {};
  for (const p of posts) counts[dayKey(p.createdAt)] = (counts[dayKey(p.createdAt)] ?? 0) + 1;
  return Object.entries(counts)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => (a.day < b.day ? 1 : -1));
}

// Posts whose month-day matches `now`'s but from an earlier year — "on this day" memories.
export function onThisDay(posts: Post[], nowUnixSec: number): Post[] {
  const md = monthDay(nowUnixSec);
  const nowYear = new Date(nowUnixSec * 1000).getUTCFullYear();
  return posts
    .filter((p) => monthDay(p.createdAt) === md && new Date(p.createdAt * 1000).getUTCFullYear() < nowYear)
    .sort((a, b) => b.createdAt - a.createdAt);
}

// Group posts into day buckets with the posts themselves, newest day first (and newest
// post first within a day) — for a sectioned timeline feed.
export interface DaySection {
  day: string;
  posts: Post[];
}

export function groupByDay(posts: Post[]): DaySection[] {
  const map = new Map<string, Post[]>();
  for (const p of [...posts].sort((a, b) => b.createdAt - a.createdAt)) {
    const k = dayKey(p.createdAt);
    (map.get(k) ?? map.set(k, []).get(k)!).push(p);
  }
  return [...map.entries()]
    .map(([day, ps]) => ({ day, posts: ps }))
    .sort((a, b) => (a.day < b.day ? 1 : -1));
}
