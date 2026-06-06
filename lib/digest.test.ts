import { describe, it, expect } from 'vitest';
import { postsInWindow, digestStats, DAY } from './digest';
import type { Post } from './types';

const NOW = 1_700_000_000;
const post = (id: string, ageDays: number, username = 'u', platform: 'threads' | 'x' = 'threads'): Post =>
  ({
    id,
    code: id,
    platform,
    permalink: '',
    author: { username, displayName: username, avatarUrl: '', verified: false },
    text: id,
    createdAt: NOW - ageDays * DAY,
    media: [],
    stats: { likes: 0, replies: 0, reposts: 0, shares: 0 },
    chain: [],
  }) as Post;

describe('postsInWindow', () => {
  it('keeps only posts within the last N days, newest first', () => {
    const posts = [post('a', 1), post('b', 6), post('c', 10), post('d', 0)];
    const w = postsInWindow(posts, NOW, 7);
    expect(w.map((p) => p.id)).toEqual(['d', 'a', 'b']); // c (10d) excluded
  });
});

describe('digestStats', () => {
  it('summarizes count, authors, platform split and top authors', () => {
    const posts = [
      post('1', 1, 'alice', 'threads'),
      post('2', 2, 'alice', 'threads'),
      post('3', 3, 'bob', 'x'),
    ];
    const s = digestStats(posts, 7);
    expect(s.count).toBe(3);
    expect(s.authors).toBe(2);
    expect(s.byPlatform).toEqual({ threads: 2, x: 1 });
    expect(s.topAuthors[0]).toEqual({ username: 'alice', count: 2 });
  });
});
