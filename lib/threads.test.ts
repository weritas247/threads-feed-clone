import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fetchAccountFeed } from './threads';

const html = readFileSync('test/fixtures/profile-autogod.html', 'utf8');

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

  it('strips a leading @ from the username in the URL', async () => {
    const spy = vi.fn(async () => new Response(html, { status: 200 }));
    vi.stubGlobal('fetch', spy);
    await fetchAccountFeed('@autogod.ai');
    expect((spy.mock.calls as unknown[][])[0][0]).toBe('https://www.threads.com/@autogod.ai');
  });
});
