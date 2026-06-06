import { describe, it, expect } from 'vitest';
import { computeStats, type StatsInput } from './stats';
import type { Post } from './types';
import type { Enrichment } from './ai/types';

const post = (id: string, platform: 'threads' | 'x' = 'threads'): Post =>
  ({
    id,
    code: id,
    platform,
    permalink: '',
    author: { username: 'u', displayName: 'U', avatarUrl: '', verified: false },
    text: id,
    createdAt: 0,
    media: [],
    stats: { likes: 0, replies: 0, reposts: 0, shares: 0 },
    chain: [],
  }) as Post;

const enr = (over: Partial<Enrichment> = {}): Enrichment => ({
  summary: '',
  topics: [],
  entities: [],
  type: 'news',
  lang: 'en',
  keepScore: 0.6,
  promptVersion: 'v1',
  enrichedAt: 0,
  ...over,
});

describe('computeStats', () => {
  const input: StatsInput = {
    posts: [post('1'), post('2'), post('3', 'x')],
    enrichment: {
      'threads:1': enr({ topics: ['ai', 'rag'], entities: [{ name: 'Claude', type: 'tool' }], keepScore: 0.8, type: 'tutorial' }),
      'threads:2': enr({ topics: ['ai'], keepScore: 0.3, type: 'news' }),
      // x:3 not enriched
      'threads:stale': enr({ promptVersion: 'old' }), // belongs to no post / stale → ignored
    },
    state: { 'threads:1': 'kept', 'threads:2': 'discarded' },
    embeddedKeys: new Set(['threads:1', 'x:3']),
    collections: [{ note: 'synthesized' }, { note: '' }],
    promptVersion: 'v1',
  };
  const s = computeStats(input);

  it('counts totals and platforms', () => {
    expect(s.total).toBe(3);
    expect(s.byPlatform).toEqual({ threads: 2, x: 1 });
  });

  it('computes coverage percentages', () => {
    expect(s.coverage.enriched).toBe(2); // threads:1, threads:2
    expect(s.coverage.embedded).toBe(2); // threads:1, x:3
    expect(s.coverage.enrichedPct).toBe(67);
  });

  it('breaks down triage with implicit inbox', () => {
    expect(s.triage).toEqual({ inbox: 1, kept: 1, archived: 0, discarded: 1 });
  });

  it('computes signal from keepScore', () => {
    expect(s.signal.avgKeepScore).toBeCloseTo(0.55); // (0.8 + 0.3)/2
    expect(s.signal.highSignal).toBe(1); // only 0.8 >= 0.5
  });

  it('aggregates distinct topics/entities and collections', () => {
    expect(s.topics.distinct).toBe(2); // ai, rag (stale ignored)
    expect(s.topics.top[0]).toEqual({ topic: 'ai', count: 2 });
    expect(s.entities.distinct).toBe(1);
    expect(s.collections).toEqual({ count: 2, synthesized: 1 });
  });
});
