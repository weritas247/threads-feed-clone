import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getVector, setVector, setVectors, embeddedKeys } from './embeddingStore';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'emb-'));
  process.env.ACCOUNTS_DATA_DIR = dir;
});
afterEach(() => {
  delete process.env.ACCOUNTS_DATA_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe('embeddingStore', () => {
  it('round-trips a vector with its embedder id', () => {
    setVector('threads', '1', 'local-fnv-256', [0.1, 0.2]);
    expect(getVector('threads', '1')).toEqual({ id: 'local-fnv-256', vector: [0.1, 0.2] });
  });

  it('batch upserts in a single write', () => {
    setVectors([
      ['threads:1', { id: 'e', vector: [1] }],
      ['x:2', { id: 'e', vector: [2] }],
    ]);
    expect(getVector('threads', '1')?.vector).toEqual([1]);
    expect(getVector('x', '2')?.vector).toEqual([2]);
  });

  it('embeddedKeys returns only keys for the matching embedder id', () => {
    setVectors([
      ['threads:1', { id: 'local-fnv-256', vector: [1] }],
      ['threads:2', { id: 'gemini-x', vector: [2] }],
    ]);
    expect(embeddedKeys('local-fnv-256')).toEqual(new Set(['threads:1']));
  });

  it('returns undefined for an unknown post', () => {
    expect(getVector('threads', 'nope')).toBeUndefined();
  });
});
