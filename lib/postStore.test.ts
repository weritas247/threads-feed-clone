import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getSavedPosts, savePosts } from './postStore';
import type { Post } from './types';

const mk = (id: string, createdAt: number, text = 't'): Post => ({
  id,
  code: id,
  author: { username: 'acct', displayName: 'A', avatarUrl: 'https://x/a.jpg', verified: false },
  text,
  createdAt,
  media: [],
  stats: { likes: 0, replies: 0, reposts: 0, shares: 0 },
  chain: [],
});

beforeEach(() => {
  process.env.ACCOUNTS_DATA_DIR = mkdtempSync(join(tmpdir(), 'posts-'));
});

describe('postStore', () => {
  it('returns empty for an account with no saved posts', () => {
    expect(getSavedPosts('nobody')).toEqual([]);
  });

  it('saves posts and reads them back newest-first', () => {
    const total = savePosts('acct', [mk('1', 100), mk('2', 300), mk('3', 200)]);
    expect(total).toBe(3);
    const saved = getSavedPosts('acct');
    expect(saved.map((p) => p.id)).toEqual(['2', '3', '1']);
  });

  it('accumulates across crawls and dedupes by id (new data wins)', () => {
    savePosts('acct', [mk('1', 100, 'old')]);
    const total = savePosts('acct', [mk('1', 100, 'new'), mk('2', 200)]);
    expect(total).toBe(2);
    const saved = getSavedPosts('acct');
    expect(saved.find((p) => p.id === '1')?.text).toBe('new');
  });

  it('isolates posts per account and tolerates @/case in the handle', () => {
    savePosts('@Acct', [mk('1', 100)]);
    expect(getSavedPosts('acct').length).toBe(1);
    expect(getSavedPosts('other').length).toBe(0);
  });
});
