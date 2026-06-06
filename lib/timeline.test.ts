import { describe, it, expect } from 'vitest';
import { activityByDay, onThisDay, groupByDay } from './timeline';
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
