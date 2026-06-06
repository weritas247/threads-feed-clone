import { describe, it, expect } from 'vitest';
import { cosine, l2normalize, norm, topK } from './vector';

describe('cosine', () => {
  it('is 1 for identical direction', () => {
    expect(cosine([1, 0], [2, 0])).toBeCloseTo(1);
  });
  it('is 0 for orthogonal vectors', () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  });
  it('is -1 for opposite vectors', () => {
    expect(cosine([1, 1], [-1, -1])).toBeCloseTo(-1);
  });
  it('returns 0 when a vector is all zeros', () => {
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });
});

describe('l2normalize', () => {
  it('produces a unit vector', () => {
    expect(norm(l2normalize([3, 4]))).toBeCloseTo(1);
  });
  it('leaves a zero vector unchanged', () => {
    expect(l2normalize([0, 0])).toEqual([0, 0]);
  });
});

describe('topK', () => {
  const items = [
    { id: 'a', v: [1, 0] },
    { id: 'b', v: [0.9, 0.1] },
    { id: 'c', v: [0, 1] },
    { id: 'd', v: null as number[] | null },
  ];

  it('ranks by similarity, highest first, and skips vector-less items', () => {
    const out = topK([1, 0], items, (i) => i.v, 2);
    expect(out.map((s) => s.item.id)).toEqual(['a', 'b']);
    expect(out[0].score).toBeGreaterThanOrEqual(out[1].score);
  });

  it('honours minScore', () => {
    const out = topK([1, 0], items, (i) => i.v, 10, 0.5);
    // c ([0,1]) is orthogonal → score 0, filtered out; d has no vector
    expect(out.map((s) => s.item.id)).toEqual(['a', 'b']);
  });
});
