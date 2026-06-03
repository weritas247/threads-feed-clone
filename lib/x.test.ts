import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseXTimeline, fetchXAccountFeed } from './x';

const html = readFileSync('test/fixtures/x-timeline-nasa.html', 'utf8');

afterEach(() => vi.restoreAllMocks());

describe('parseXTimeline (real fixture)', () => {
  const posts = parseXTimeline(html, 'nasa');

  it('extracts tweets as normalized X posts', () => {
    expect(posts.length).toBeGreaterThan(0);
    const p = posts[0];
    expect(p.platform).toBe('x');
    expect(p.author.username.toLowerCase()).toBe('nasa');
    expect(p.permalink).toMatch(/^https:\/\/x\.com\/NASA\/status\/\d+$/);
    expect(p.id).toMatch(/^\d+$/);
    expect(typeof p.createdAt).toBe('number');
    expect(p.createdAt).toBeGreaterThan(1000000000);
  });

  it('maps engagement stats and text', () => {
    const p = posts[0];
    expect(typeof p.stats.likes).toBe('number');
    expect(typeof p.stats.reposts).toBe('number');
    expect(p.text.length).toBeGreaterThan(0);
  });

  it('is sorted newest-first with unique ids', () => {
    for (let i = 1; i < posts.length; i++) {
      expect(posts[i - 1].createdAt).toBeGreaterThanOrEqual(posts[i].createdAt);
    }
    expect(new Set(posts.map((p) => p.id)).size).toBe(posts.length);
  });
});

describe('fetchXAccountFeed', () => {
  it('returns ok with posts when the timeline parses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(html, { status: 200 })));
    const res = await fetchXAccountFeed('@nasa');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.posts.length).toBeGreaterThan(0);
  });

  it('hits the syndication endpoint with the bare handle', async () => {
    const spy = vi.fn(async () => new Response(html, { status: 200 }));
    vi.stubGlobal('fetch', spy);
    await fetchXAccountFeed('@nasa');
    expect((spy.mock.calls as unknown[][])[0][0]).toBe(
      'https://syndication.twitter.com/srv/timeline-profile/screen-name/nasa',
    );
  });

  it('returns not_found on 404 and parse_error on empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    expect(await fetchXAccountFeed('nope')).toEqual({ ok: false, reason: 'not_found' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html></html>', { status: 200 })));
    expect(await fetchXAccountFeed('nasa')).toEqual({ ok: false, reason: 'parse_error' });
  });
});
