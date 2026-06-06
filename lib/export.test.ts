import { describe, it, expect } from 'vitest';
import { collectionToMarkdown, safeFilename, asciiFilename } from './export';
import type { Post } from './types';

const post = (over: Partial<Post> = {}): Post =>
  ({
    id: '1',
    code: '1',
    platform: 'threads',
    permalink: 'https://threads.com/@u/post/1',
    author: { username: 'u', displayName: 'U', avatarUrl: '', verified: false },
    text: 'Hello world',
    createdAt: 1700000000,
    media: [],
    stats: { likes: 0, replies: 0, reposts: 0, shares: 0 },
    chain: [],
    ...over,
  }) as Post;

describe('collectionToMarkdown', () => {
  it('includes name, count, synthesis note, post body and original link', () => {
    const md = collectionToMarkdown([post()], { name: 'My AI notes', note: 'A summary.' });
    expect(md).toContain('# My AI notes');
    expect(md).toContain('1 post');
    expect(md).toContain('## Synthesis');
    expect(md).toContain('A summary.');
    expect(md).toContain('Hello world');
    expect(md).toContain('[Original](https://threads.com/@u/post/1)');
    expect(md).toContain('2023-11-14'); // isoDate(1700000000)
  });

  it('renders tags as #hashtags by default and [[wikilinks]] in obsidian mode', () => {
    const opts = { name: 'c', tagsOf: () => ['ai', 'agents'] };
    expect(collectionToMarkdown([post()], opts)).toContain('Tags: #ai #agents');
    expect(collectionToMarkdown([post()], { ...opts, obsidian: true })).toContain('Tags: [[ai]] [[agents]]');
  });

  it('includes thread chain text', () => {
    const md = collectionToMarkdown([post({ chain: [post({ id: '2', text: 'part two' })] })], { name: 'c' });
    expect(md).toContain('part two');
  });
});

describe('safeFilename', () => {
  it('strips unsafe chars and keeps unicode letters', () => {
    expect(safeFilename('AI 도구 / notes!')).toBe('AI-도구-notes');
  });
  it('falls back for empty/garbage names', () => {
    expect(safeFilename('///')).toBe('collection');
  });
});

describe('asciiFilename', () => {
  it('strips non-ASCII so it is header-safe (latin1)', () => {
    const f = asciiFilename('AI 도구 모음');
    expect(f).toBe('AI');
    expect([...f].every((c) => c.charCodeAt(0) <= 255)).toBe(true);
  });
  it('falls back to collection when nothing ASCII remains', () => {
    expect(asciiFilename('도구 모음')).toBe('collection');
  });
});
