import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fetchAccountFeed, fetchProfileAvatar } from './threads';

const html = readFileSync('test/fixtures/profile-autogod.html', 'utf8');
const webProfile = readFileSync('test/fixtures/web_profile_info-autogod.json', 'utf8');

afterEach(() => vi.restoreAllMocks());

describe('fetchAccountFeed', () => {
  it('returns ok with posts when the page parses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(html, { status: 200 })));
    const res = await fetchAccountFeed('autogod.ai');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.posts.length).toBeGreaterThan(0);
  });

  it('returns not_found on 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const res = await fetchAccountFeed('nope');
    expect(res).toEqual({ ok: false, reason: 'not_found' });
  });

  it('returns blocked on other non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })));
    const res = await fetchAccountFeed('autogod.ai');
    expect(res).toEqual({ ok: false, reason: 'blocked' });
  });

  it('returns parse_error when no posts are found', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html></html>', { status: 200 })));
    const res = await fetchAccountFeed('autogod.ai');
    expect(res).toEqual({ ok: false, reason: 'parse_error' });
  });

  it('returns private when a postless page carries the private flag', async () => {
    const privateHtml =
      '<html><script type="application/json">{"user":{"text_post_app_is_private":true}}</script></html>';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(privateHtml, { status: 200 })));
    const res = await fetchAccountFeed('someone');
    expect(res).toEqual({ ok: false, reason: 'private' });
  });

  it('strips a leading @ from the username in the URL', async () => {
    const spy = vi.fn(async () => new Response(html, { status: 200 }));
    vi.stubGlobal('fetch', spy);
    await fetchAccountFeed('@autogod.ai');
    expect((spy.mock.calls as unknown[][])[0][0]).toBe('https://www.threads.com/@autogod.ai');
  });
});

describe('fetchProfileAvatar', () => {
  it('returns the profile picture URL from web_profile_info', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(webProfile, { status: 200 })));
    const url = await fetchProfileAvatar('@autogod.ai');
    expect(url).toMatch(/^https:\/\/.*cdninstagram\.com/);
  });

  it('queries the instagram web_profile_info endpoint with the bare handle', async () => {
    const spy = vi.fn(async () => new Response(webProfile, { status: 200 }));
    vi.stubGlobal('fetch', spy);
    await fetchProfileAvatar('@autogod.ai');
    expect((spy.mock.calls as unknown[][])[0][0]).toContain('web_profile_info/?username=autogod.ai');
  });

  it('returns null on a failed lookup', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    expect(await fetchProfileAvatar('nobody')).toBeNull();
  });
});
