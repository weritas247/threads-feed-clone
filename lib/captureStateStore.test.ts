import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getState, setState, stateCounts, filterByState } from './captureStateStore';
import type { Post } from './types';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cap-'));
  process.env.ACCOUNTS_DATA_DIR = dir;
});
afterEach(() => {
  delete process.env.ACCOUNTS_DATA_DIR;
  rmSync(dir, { recursive: true, force: true });
});

const post = (id: string): Post =>
  ({
    id,
    code: id,
    platform: 'threads',
    permalink: '',
    author: { username: 'u', displayName: 'U', avatarUrl: '', verified: false },
    text: id,
    createdAt: 0,
    media: [],
    stats: { likes: 0, replies: 0, reposts: 0, shares: 0 },
    chain: [],
  }) as Post;

describe('captureStateStore', () => {
  it('defaults unknown posts to inbox', () => {
    expect(getState('threads', 'x')).toBe('inbox');
  });

  it('persists a state change', () => {
    setState('threads', '1', 'kept');
    expect(getState('threads', '1')).toBe('kept');
  });

  it('clears the record when set back to inbox', () => {
    setState('threads', '1', 'discarded');
    setState('threads', '1', 'inbox');
    expect(getState('threads', '1')).toBe('inbox');
  });

  it('counts states including implicit inbox', () => {
    setState('threads', '2', 'kept');
    const counts = stateCounts(['1', '2', '3'].map(post));
    expect(counts).toEqual({ inbox: 2, kept: 1, archived: 0, discarded: 0 });
  });

  it('filters by state', () => {
    setState('threads', '2', 'kept');
    const kept = filterByState(['1', '2', '3'].map(post), 'kept');
    expect(kept.map((p) => p.id)).toEqual(['2']);
  });
});
