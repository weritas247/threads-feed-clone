import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createCollection,
  listCollections,
  getCollection,
  addToCollection,
  removeFromCollection,
  renameCollection,
  deleteCollection,
  setCollectionNote,
  collectionsForPost,
} from './collectionStore';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'col-'));
  process.env.ACCOUNTS_DATA_DIR = dir;
});
afterEach(() => {
  delete process.env.ACCOUNTS_DATA_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe('collectionStore', () => {
  it('creates and lists collections', () => {
    const c = createCollection('AI tools');
    expect(c.name).toBe('AI tools');
    expect(listCollections().map((x) => x.id)).toContain(c.id);
  });

  it('falls back to Untitled for a blank name', () => {
    expect(createCollection('   ').name).toBe('Untitled');
  });

  it('adds posts idempotently in insertion order', () => {
    const c = createCollection('x');
    addToCollection(c.id, 'threads', '1');
    addToCollection(c.id, 'x', '2');
    addToCollection(c.id, 'threads', '1'); // dup
    expect(getCollection(c.id)?.postKeys).toEqual(['threads:1', 'x:2']);
  });

  it('removes a post by key', () => {
    const c = createCollection('x');
    addToCollection(c.id, 'threads', '1');
    addToCollection(c.id, 'x', '2');
    removeFromCollection(c.id, 'threads:1');
    expect(getCollection(c.id)?.postKeys).toEqual(['x:2']);
  });

  it('renames, sets a synthesis note, and deletes', () => {
    const c = createCollection('old');
    renameCollection(c.id, 'new');
    setCollectionNote(c.id, 'a synthesized note');
    const got = getCollection(c.id)!;
    expect(got.name).toBe('new');
    expect(got.note).toBe('a synthesized note');
    expect(deleteCollection(c.id)).toBe(true);
    expect(getCollection(c.id)).toBeUndefined();
  });

  it('finds which collections contain a post', () => {
    const a = createCollection('a');
    const b = createCollection('b');
    addToCollection(a.id, 'threads', '1');
    addToCollection(b.id, 'threads', '1');
    expect(collectionsForPost('threads', '1').map((c) => c.id).sort()).toEqual([a.id, b.id].sort());
  });
});
