import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setVectors } from './embeddingStore';
import { rankByVector, relatedPosts, mergeHybrid } from './semanticSearch';
import { l2normalize } from './vector';
import type { Post } from './types';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sem-'));
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

const EID = 'test-embedder';

describe('rankByVector', () => {
  it('ranks posts by similarity and ignores other-embedder vectors', () => {
    setVectors([
      ['threads:a', { id: EID, vector: l2normalize([1, 0]) }],
      ['threads:b', { id: EID, vector: l2normalize([0.8, 0.2]) }],
      ['threads:c', { id: EID, vector: l2normalize([0, 1]) }],
      ['threads:d', { id: 'other', vector: l2normalize([1, 0]) }], // wrong embedder → skipped
    ]);
    const posts = ['a', 'b', 'c', 'd'].map(post);
    const out = rankByVector(posts, l2normalize([1, 0]), EID, 10, 0);
    expect(out.map((s) => s.item.id)).toEqual(['a', 'b']); // c orthogonal (score 0, filtered), d wrong embedder
  });
});

describe('relatedPosts', () => {
  it('finds neighbours of a post and excludes itself', () => {
    setVectors([
      ['threads:a', { id: EID, vector: l2normalize([1, 0]) }],
      ['threads:b', { id: EID, vector: l2normalize([0.9, 0.1]) }],
      ['threads:c', { id: EID, vector: l2normalize([0, 1]) }],
    ]);
    const posts = ['a', 'b', 'c'].map(post);
    const out = relatedPosts(post('a'), posts, EID, 5);
    expect(out.map((s) => s.item.id)).toEqual(['b']); // b near, c orthogonal, a excluded
  });
});

describe('mergeHybrid', () => {
  it('keeps exact hits and drops them from the related list', () => {
    const exact = [post('a')];
    const semantic = [
      { item: post('a'), score: 0.9 },
      { item: post('b'), score: 0.7 },
    ];
    const out = mergeHybrid(exact, semantic);
    expect(out.exact.map((p) => p.id)).toEqual(['a']);
    expect(out.related.map((s) => s.item.id)).toEqual(['b']);
  });
});
