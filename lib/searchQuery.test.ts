import { describe, it, expect } from 'vitest';
import {
  parseFilters,
  applyFilters,
  hybridRank,
  sortPosts,
  computeFacets,
  activeFilterCount,
  type SearchContext,
} from './searchQuery';
import type { Post } from './types';
import type { Enrichment } from './ai/types';
import { l2normalize } from './vector';

const post = (over: Partial<Post> & { id: string }): Post =>
  ({
    code: over.id,
    platform: 'threads',
    permalink: '',
    author: { username: 'u', displayName: 'U', avatarUrl: '', verified: false },
    text: '',
    createdAt: 0,
    media: [],
    stats: { likes: 0, replies: 0, reposts: 0, shares: 0 },
    chain: [],
    ...over,
  }) as Post;

const enr = (over: Partial<Enrichment> = {}): Enrichment => ({
  summary: '', topics: [], entities: [], type: 'news', lang: 'en', keepScore: 0.5,
  promptVersion: 'v1', enrichedAt: 0, ...over,
});

const ctx = (over: Partial<SearchContext> = {}): SearchContext => ({
  enrichment: {}, state: {}, tagMap: {}, notes: {}, vectors: {}, embedderId: 'e', ...over,
});

describe('parseFilters', () => {
  it('parses valid params and ignores invalid', () => {
    const f = parseFilters({ platform: 'x', type: 'tutorial', topic: 'AI', state: 'kept', author: 'Manus', after: '2024-06-01', type2: 'bad' } as Record<string, string>);
    expect(f.platform).toBe('x');
    expect(f.type).toBe('tutorial');
    expect(f.topic).toBe('ai'); // lowercased
    expect(f.state).toBe('kept');
    expect(f.author).toBe('manus');
    expect(f.after).toBe(Math.floor(Date.parse('2024-06-01T00:00:00Z') / 1000));
    expect(activeFilterCount(f)).toBe(6);
    expect(parseFilters({ platform: 'bogus', type: 'nope' }).platform).toBeUndefined();
  });
});

describe('applyFilters', () => {
  const posts = [
    post({ id: '1', platform: 'threads', author: { username: 'manus', displayName: 'M', avatarUrl: '', verified: false }, createdAt: 100 }),
    post({ id: '2', platform: 'x', createdAt: 200 }),
  ];
  const c = ctx({
    enrichment: { 'threads:1': enr({ topics: ['ai'], type: 'tutorial', entities: [{ name: 'Claude', type: 'tool' }] }) },
    state: { 'threads:1': 'kept' },
    tagMap: { 'x:2': ['fav'] },
  });

  it('filters by platform', () => {
    expect(applyFilters(posts, { platform: 'x' }, c).map((p) => p.id)).toEqual(['2']);
  });
  it('filters by topic/type/entity (enrichment)', () => {
    expect(applyFilters(posts, { topic: 'ai' }, c).map((p) => p.id)).toEqual(['1']);
    expect(applyFilters(posts, { type: 'tutorial' }, c).map((p) => p.id)).toEqual(['1']);
    expect(applyFilters(posts, { entity: 'Claude' }, c).map((p) => p.id)).toEqual(['1']);
  });
  it('filters by state, author, tag, date', () => {
    expect(applyFilters(posts, { state: 'kept' }, c).map((p) => p.id)).toEqual(['1']);
    expect(applyFilters(posts, { author: 'manus' }, c).map((p) => p.id)).toEqual(['1']);
    expect(applyFilters(posts, { tag: 'fav' }, c).map((p) => p.id)).toEqual(['2']);
    expect(applyFilters(posts, { after: 150 }, c).map((p) => p.id)).toEqual(['2']);
  });
});

describe('hybridRank', () => {
  it('ranks keyword matches above pure-semantic, includes semantic-only for recall', () => {
    const posts = [
      post({ id: 'kw', text: 'agent automation workflow' }),
      post({ id: 'sem', text: 'something unrelated' }),
      post({ id: 'none', text: 'cats and dogs' }),
    ];
    const c = ctx({
      vectors: {
        'threads:sem': { id: 'e', vector: l2normalize([1, 0]) },
        'threads:kw': { id: 'e', vector: l2normalize([0, 1]) },
      },
    });
    const ranked = hybridRank(posts, 'agent automation', l2normalize([1, 0]), c);
    expect(ranked[0].post.id).toBe('kw'); // keyword match wins
    expect(ranked.map((r) => r.post.id)).toContain('sem'); // semantic recall included
    expect(ranked.find((r) => r.post.id === 'none')).toBeUndefined(); // irrelevant dropped
  });
});

describe('sortPosts', () => {
  it('sorts by recent and by engagement', () => {
    const posts = [
      post({ id: 'a', createdAt: 1, stats: { likes: 10, replies: 0, reposts: 0, shares: 0 } }),
      post({ id: 'b', createdAt: 2, stats: { likes: 1, replies: 0, reposts: 0, shares: 0 } }),
    ];
    expect(sortPosts(posts, 'recent').map((p) => p.id)).toEqual(['b', 'a']);
    expect(sortPosts(posts, 'engagement').map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('computeFacets', () => {
  it('counts platform/type/topic/state/author', () => {
    const posts = [
      post({ id: '1', platform: 'threads', author: { username: 'manus', displayName: 'M', avatarUrl: '', verified: false } }),
      post({ id: '2', platform: 'x' }),
    ];
    const c = ctx({
      enrichment: {
        'threads:1': enr({ topics: ['ai', 'rag'], type: 'tutorial' }),
        'x:2': enr({ topics: ['ai'], type: 'news' }),
      },
      state: { 'threads:1': 'kept' },
    });
    const f = computeFacets(posts, c);
    expect(f.platforms).toContainEqual({ value: 'threads', count: 1 });
    expect(f.topics[0]).toEqual({ value: 'ai', count: 2 });
    expect(f.states).toContainEqual({ value: 'kept', count: 1 });
    expect(f.authors).toContainEqual({ value: 'manus', count: 1 });
  });
});
