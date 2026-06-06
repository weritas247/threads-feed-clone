import { describe, it, expect } from 'vitest';
import { activityByDay, onThisDay, groupByDay, calendarHeatmap } from './timeline';
import type { Post } from './types';

// 2024-06-06T12:00:00Z and friends as unix seconds.
const D = (iso: string) => Math.floor(Date.parse(iso) / 1000);

const post = (id: string, iso: string): Post =>
  ({
    id,
    code: id,
    platform: 'threads',
    permalink: '',
    author: { username: 'u', displayName: 'U', avatarUrl: '', verified: false },
    text: id,
    createdAt: D(iso),
    media: [],
    stats: { likes: 0, replies: 0, reposts: 0, shares: 0 },
    chain: [],
  }) as Post;

describe('activityByDay', () => {
  it('counts posts per day, newest day first', () => {
    const posts = [
      post('1', '2024-06-06T01:00:00Z'),
      post('2', '2024-06-06T20:00:00Z'),
      post('3', '2024-06-05T10:00:00Z'),
    ];
    expect(activityByDay(posts)).toEqual([
      { day: '2024-06-06', count: 2 },
      { day: '2024-06-05', count: 1 },
    ]);
  });
});

describe('onThisDay', () => {
  it('returns earlier-year posts sharing the month-day', () => {
    const now = D('2024-06-06T09:00:00Z');
    const posts = [
      post('thisyear', '2024-06-06T01:00:00Z'), // same year → excluded
      post('lastyear', '2023-06-06T01:00:00Z'), // match
      post('other', '2022-05-06T01:00:00Z'), // different month-day → excluded
      post('older', '2021-06-06T01:00:00Z'), // match
    ];
    expect(onThisDay(posts, now).map((p) => p.id)).toEqual(['lastyear', 'older']);
  });
});

describe('calendarHeatmap', () => {
  const now = D('2024-06-06T12:00:00Z'); // Thursday
  it('builds a weeks×7 grid with counts and busiest, ignoring future cells', () => {
    const posts = [
      post('a', '2024-06-03T01:00:00Z'), // this week (Mon)
      post('b', '2024-06-03T05:00:00Z'),
      post('c', '2024-05-20T05:00:00Z'),
    ];
    const h = calendarHeatmap(posts, now, 4);
    expect(h.weeks).toHaveLength(4);
    expect(h.weeks.every((w) => w.length === 7)).toBe(true);
    expect(h.totalPosts).toBe(3);
    expect(h.busiest).toEqual({ date: '2024-06-03', count: 2 });
    expect(h.maxCount).toBe(2);
    // Cells after `now` (e.g. Sat 2024-06-08) are marked future with no count.
    const future = h.weeks.flat().find((c) => c.date === '2024-06-08');
    expect(future?.future).toBe(true);
    expect(future?.count).toBe(0);
    // The known busy day appears with its count.
    const busy = h.weeks.flat().find((c) => c.date === '2024-06-03');
    expect(busy?.count).toBe(2);
  });

  it('computes avg per active day', () => {
    const posts = [post('a', '2024-06-03T01:00:00Z'), post('b', '2024-06-04T01:00:00Z'), post('c', '2024-06-04T02:00:00Z')];
    const h = calendarHeatmap(posts, now, 4);
    expect(h.activeDays).toBe(2);
    expect(h.avgPerActiveDay).toBe(1.5);
  });
});

describe('groupByDay', () => {
  it('sections posts by day, newest first within and across days', () => {
    const posts = [
      post('a', '2024-06-05T10:00:00Z'),
      post('b', '2024-06-06T08:00:00Z'),
      post('c', '2024-06-06T20:00:00Z'),
    ];
    const sections = groupByDay(posts);
    expect(sections.map((s) => s.day)).toEqual(['2024-06-06', '2024-06-05']);
    expect(sections[0].posts.map((p) => p.id)).toEqual(['c', 'b']); // newest first within day
  });
});
