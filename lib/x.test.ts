import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseXTimeline, fetchXAccountFeed, collectXPostsFromData } from './x';

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

describe('collectXPostsFromData (x.com GraphQL capture)', () => {
  // A bookmarks-like response: one tweet with the legacy author shape, one nested
  // under a visibility wrapper with the newer core/avatar author shape.
  const tweetResult = (rest_id: string, user: object, full_text: string, created_at: string) => ({
    content: { itemContent: { tweet_results: { result: { rest_id, core: { user_results: { result: user } }, legacy: { id_str: rest_id, full_text, created_at, favorite_count: 5, reply_count: 1, retweet_count: 2, quote_count: 0 } } } } },
  });
  const legacyUser = { legacy: { screen_name: 'alice', name: 'Alice', profile_image_url_https: 'https://x/a_normal.jpg', verified: false } };
  const coreUser = { is_blue_verified: true, core: { screen_name: 'bob', name: 'Bob' }, avatar: { image_url: 'https://x/b.jpg' } };
  const payload = {
    data: {
      bookmark_timeline_v2: {
        timeline: {
          instructions: [
            { type: 'TimelineAddEntries', entries: [
              tweetResult('100', legacyUser, 'hello from alice', 'Wed Oct 01 12:00:00 +0000 2025'),
              { content: { itemContent: { tweet_results: { result: { __typename: 'TweetWithVisibilityResults', tweet: { rest_id: '200', core: { user_results: { result: coreUser } }, legacy: { id_str: '200', full_text: 'hello from bob', created_at: 'Thu Oct 02 12:00:00 +0000 2025', favorite_count: 9 } } } } } } },
            ] },
          ],
        },
      },
    },
  };

  it('extracts tweets from arbitrary nesting, both author shapes, newest-first', () => {
    const posts = collectXPostsFromData(payload);
    expect(posts.map((p) => p.id)).toEqual(['200', '100']);
    expect(posts.every((p) => p.platform === 'x')).toBe(true);
    const alice = posts.find((p) => p.id === '100')!;
    expect(alice.author.username).toBe('alice');
    expect(alice.permalink).toBe('https://x.com/alice/status/100');
    expect(alice.text).toBe('hello from alice');
    const bob = posts.find((p) => p.id === '200')!;
    expect(bob.author.username).toBe('bob');
    expect(bob.author.verified).toBe(true); // is_blue_verified
  });

  it('returns nothing for non-X data', () => {
    expect(collectXPostsFromData({ thread_items: [] })).toEqual([]);
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
