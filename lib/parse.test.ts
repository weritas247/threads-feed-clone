import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { extractJsonScripts, parseProfileHtml, collectPostsFromData } from './parse';

describe('extractJsonScripts', () => {
  it('returns the contents of each application/json script', () => {
    const html = `
      <html><head></head><body>
      <script type="application/json" data-sjs>{"a":1}</script>
      <script>console.log('ignore me')</script>
      <script type="application/json">{"b":[2,3]}</script>
      </body></html>`;
    const blocks = extractJsonScripts(html);
    expect(blocks).toEqual(['{"a":1}', '{"b":[2,3]}']);
  });
});

describe('parseProfileHtml (real fixture)', () => {
  const html = readFileSync('test/fixtures/profile-autogod.html', 'utf8');
  const posts = parseProfileHtml(html);

  it('extracts at least one post', () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it('maps author from the lead post', () => {
    const p = posts[0];
    expect(p.author.displayName.length).toBeGreaterThan(0);
    expect(p.author.avatarUrl).toMatch(/^https:\/\//);
  });

  it("when a username is given, returns only that account's posts", () => {
    const onlyAutogod = parseProfileHtml(html, 'autogod.ai');
    expect(onlyAutogod.length).toBeGreaterThan(0);
    expect(onlyAutogod.every((p) => p.author.username === 'autogod.ai')).toBe(true);
  });

  it('maps id, code, text, createdAt and numeric stats', () => {
    const p = posts[0];
    expect(p.id.length).toBeGreaterThan(0);
    expect(p.code.length).toBeGreaterThan(0);
    expect(typeof p.createdAt).toBe('number');
    expect(p.createdAt).toBeGreaterThan(1000000000);
    expect(typeof p.stats.likes).toBe('number');
    expect(typeof p.stats.replies).toBe('number');
    expect(typeof p.stats.reposts).toBe('number');
  });

  it('does not return duplicate post ids', () => {
    const ids = posts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('collectPostsFromData', () => {
  // The Saved bookmarklet hands us already-parsed Threads API JSON nested anywhere.
  const item = (pk: string, username: string, taken_at: number) => ({
    post: {
      pk,
      code: `code_${pk}`,
      taken_at,
      caption: { text: `post ${pk}` },
      user: { username, full_name: username, profile_pic_url: 'https://x/a.jpg', is_verified: false },
    },
  });
  const payload = {
    source: 'threads-saved',
    blocks: [
      { data: { feed: { edges: [{ node: { thread_items: [item('1', 'alice', 100)] } }] } } },
      { nested: [{ thread_items: [item('2', 'bob', 300)] }] },
    ],
  };

  it('extracts posts from many authors regardless of nesting', () => {
    const out = collectPostsFromData(payload);
    expect(out.map((p) => p.id)).toEqual(['2', '1']); // newest-first
    expect(out.map((p) => p.author.username).sort()).toEqual(['alice', 'bob']);
    expect(out[0].platform).toBe('threads');
    expect(out[0].permalink).toContain('/post/code_2');
  });

  it('filters to a single author when a username is given', () => {
    const out = collectPostsFromData(payload, 'alice');
    expect(out.map((p) => p.author.username)).toEqual(['alice']);
  });

  it('returns nothing for data without thread_items', () => {
    expect(collectPostsFromData({ hello: 'world' })).toEqual([]);
  });
});
