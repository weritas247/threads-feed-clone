import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getPostTags,
  addPostTag,
  removePostTag,
  getTagMap,
  allPostTags,
  tagCounts,
  keysWithTag,
  parseTagParam,
  filterPostsByTags,
  tagsForPosts,
} from './postTagStore';
import type { Platform, Post } from './types';

const mkPost = (id: string, platform: Platform = 'threads'): Post => ({
  id,
  code: id,
  platform,
  permalink: `https://x/${id}`,
  author: { username: 'u', displayName: 'U', avatarUrl: '', verified: false },
  text: 't',
  createdAt: 1,
  media: [],
  stats: { likes: 0, replies: 0, reposts: 0, shares: 0 },
  chain: [],
});

beforeEach(() => {
  process.env.ACCOUNTS_DATA_DIR = mkdtempSync(join(tmpdir(), 'posttags-'));
});

describe('postTagStore', () => {
  it('returns no tags for an untagged post', () => {
    expect(getPostTags('threads', '1')).toEqual([]);
    expect(getTagMap()).toEqual({});
  });

  it('adds tags (normalized) and dedupes', () => {
    addPostTag('threads', '1', '  AI ');
    const tags = addPostTag('threads', '1', 'ai'); // dup after normalize
    expect(tags).toEqual(['ai']);
    expect(addPostTag('threads', '1', 'news')).toEqual(['ai', 'news']);
  });

  it('removes a tag and drops the entry when empty', () => {
    addPostTag('x', '9', 'keep');
    addPostTag('x', '9', 'drop');
    expect(removePostTag('x', '9', 'drop')).toEqual(['keep']);
    removePostTag('x', '9', 'keep');
    expect(getTagMap()).toEqual({}); // empty entry pruned
  });

  it('keys posts by platform:id (same id, different platform is distinct)', () => {
    addPostTag('threads', '1', 'a');
    addPostTag('x', '1', 'b');
    expect(getPostTags('threads', '1')).toEqual(['a']);
    expect(getPostTags('x', '1')).toEqual(['b']);
  });

  it('tagCounts and allPostTags aggregate across posts', () => {
    addPostTag('threads', '1', 'ai');
    addPostTag('threads', '2', 'ai');
    addPostTag('threads', '2', 'news');
    expect(tagCounts()).toEqual({ ai: 2, news: 1 });
    expect(allPostTags()).toEqual(['ai', 'news']);
  });

  it('keysWithTag returns the matching post keys', () => {
    addPostTag('threads', '1', 'ai');
    addPostTag('x', '5', 'ai');
    addPostTag('threads', '2', 'news');
    expect(keysWithTag('AI')).toEqual(new Set(['threads:1', 'x:5']));
    expect(keysWithTag('missing')).toEqual(new Set());
  });

  it('parseTagParam splits, normalizes, and dedupes', () => {
    expect(parseTagParam(undefined)).toEqual([]);
    expect(parseTagParam('AI, news ,ai,')).toEqual(['ai', 'news']);
  });

  it('filterPostsByTags keeps posts carrying EVERY selected tag (AND)', () => {
    addPostTag('threads', '1', 'ai');
    addPostTag('threads', '1', 'news');
    addPostTag('threads', '2', 'ai');
    const posts = [mkPost('1'), mkPost('2')];
    expect(filterPostsByTags(posts, []).map((p) => p.id)).toEqual(['1', '2']); // no-op
    expect(filterPostsByTags(posts, ['ai']).map((p) => p.id)).toEqual(['1', '2']);
    expect(filterPostsByTags(posts, ['ai', 'news']).map((p) => p.id)).toEqual(['1']); // AND
    expect(filterPostsByTags(posts, ['missing'])).toEqual([]);
  });

  it('tagsForPosts returns distinct sorted tags present in the given posts only', () => {
    addPostTag('threads', '1', 'news');
    addPostTag('threads', '1', 'ai');
    addPostTag('threads', '2', 'ai');
    addPostTag('threads', '9', 'other'); // not in the post set below
    expect(tagsForPosts([mkPost('1'), mkPost('2')])).toEqual(['ai', 'news']);
  });
});
