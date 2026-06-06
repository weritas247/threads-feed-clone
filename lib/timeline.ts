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

// --- Calendar heatmap (GitHub-contributions style) --------------------------------

const DAY_MS = 86_400_000;
const dayKeyOf = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export interface HeatCell {
  date: string; // YYYY-MM-DD
  count: number;
  future: boolean; // beyond `now` — rendered empty
}

export interface Heatmap {
  weeks: HeatCell[][]; // columns; each is 7 cells Sun..Sat
  months: Array<{ col: number; label: string }>;
  maxCount: number;
  totalPosts: number;
  activeDays: number;
  busiest: { date: string; count: number } | null;
  avgPerActiveDay: number;
  rangeStart: string;
  rangeEnd: string;
}

// Build a `weeks`-column heatmap ending at the week containing `now`. Each cell carries its
// date + post count, so the UI can colour by density, show tooltips, and drill into a day.
export function calendarHeatmap(posts: Post[], nowUnixSec: number, weeks = 18): Heatmap {
  const counts: Record<string, number> = {};
  for (const p of posts) {
    const k = dayKeyOf(p.createdAt * 1000);
    counts[k] = (counts[k] ?? 0) + 1;
  }

  // Start at the Sunday (weeks-1) weeks before the current week.
  const nowMs = nowUnixSec * 1000;
  const nowDow = new Date(nowMs).getUTCDay(); // 0=Sun
  const thisWeekSunday = nowMs - nowDow * DAY_MS;
  const firstMs = thisWeekSunday - (weeks - 1) * 7 * DAY_MS;

  const grid: HeatCell[][] = [];
  const months: Array<{ col: number; label: string }> = [];
  let prevMonth = -1;
  let maxCount = 0;

  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    const colStartMs = firstMs + w * 7 * DAY_MS;
    const colMonth = new Date(colStartMs).getUTCMonth();
    if (colMonth !== prevMonth) {
      months.push({ col: w, label: MONTHS[colMonth] });
      prevMonth = colMonth;
    }
    for (let d = 0; d < 7; d++) {
      const ms = colStartMs + d * DAY_MS;
      const date = dayKeyOf(ms);
      const future = ms > nowMs;
      const count = future ? 0 : counts[date] ?? 0;
      if (count > maxCount) maxCount = count;
      col.push({ date, count, future });
    }
    grid.push(col);
  }

  const totalPosts = posts.length;
  const activeDays = Object.values(counts).filter((c) => c > 0).length;
  let busiest: { date: string; count: number } | null = null;
  for (const [date, count] of Object.entries(counts)) {
    if (!busiest || count > busiest.count) busiest = { date, count };
  }
  const avgPerActiveDay = activeDays ? Math.round((totalPosts / activeDays) * 10) / 10 : 0;

  return {
    weeks: grid,
    months,
    maxCount,
    totalPosts,
    activeDays,
    busiest,
    avgPerActiveDay,
    rangeStart: dayKeyOf(firstMs),
    rangeEnd: dayKeyOf(nowMs),
  };
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
