import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getBookmarks,
  addBookmarks,
  clearBookmarks,
  addBookmark,
  removeBookmark,
  bookmarkedKeys,
} from './bookmarkStore';
import type { Platform, Post } from './types';

const mk = (id: string, createdAt: number, username = 'acct', platform: Platform = 'threads'): Post => ({
  id,
  code: id,
  platform,
  permalink: `https://www.threads.com/@${username}/post/${id}`,
  author: { username, displayName: username, avatarUrl: 'https://x/a.jpg', verified: false },
  text: 't',
  createdAt,
  media: [],
  stats: { likes: 0, replies: 0, reposts: 0, shares: 0 },
  chain: [],
});

beforeEach(() => {
  process.env.ACCOUNTS_DATA_DIR = mkdtempSync(join(tmpdir(), 'bookmarks-'));
});

describe('bookmarkStore', () => {
  it('returns empty before anything is imported', () => {
    expect(getBookmarks()).toEqual([]);
  });

  it('adds posts from many authors and reads them back newest-first', () => {
    const { added, total } = addBookmarks([mk('1', 100, 'alice'), mk('2', 300, 'bob'), mk('3', 200, 'carol')]);
    expect(added).toBe(3);
    expect(total).toBe(3);
    expect(getBookmarks().map((p) => p.id)).toEqual(['2', '3', '1']);
  });

  it('dedupes across imports by platform:id and counts only new additions', () => {
    addBookmarks([mk('1', 100)]);
    const { added, total } = addBookmarks([mk('1', 100), mk('2', 200)]);
    expect(added).toBe(1);
    expect(total).toBe(2);
  });

  it('treats the same id on different platforms as distinct', () => {
    addBookmarks([mk('1', 100, 'a', 'threads'), mk('1', 100, 'a', 'x')]);
    expect(getBookmarks().length).toBe(2);
  });

  it('clears all bookmarks', () => {
    addBookmarks([mk('1', 100)]);
    clearBookmarks();
    expect(getBookmarks()).toEqual([]);
  });

  it('adds and removes a single post (in-feed save button)', () => {
    addBookmark(mk('1', 100, 'alice'));
    addBookmark(mk('2', 200, 'bob'));
    expect(bookmarkedKeys()).toEqual(new Set(['threads:1', 'threads:2']));
    const total = removeBookmark('threads', '1');
    expect(total).toBe(1);
    expect(bookmarkedKeys()).toEqual(new Set(['threads:2']));
  });

  it('removeBookmark only matches the same platform', () => {
    addBookmark(mk('1', 100, 'a', 'threads'));
    addBookmark(mk('1', 100, 'a', 'x'));
    removeBookmark('x', '1');
    expect(bookmarkedKeys()).toEqual(new Set(['threads:1']));
  });
});
