import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { extractJsonScripts, parseProfileHtml } from './parse';

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
