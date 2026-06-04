import { describe, it, expect } from 'vitest';
import { parseAccountInput } from './accountInput';

describe('parseAccountInput', () => {
  it('returns null for empty input', () => {
    expect(parseAccountInput('   ', 'threads')).toBeNull();
  });

  it('treats a bare handle as the fallback platform', () => {
    expect(parseAccountInput('@Zuck', 'threads')).toEqual({
      username: 'zuck',
      platform: 'threads',
      fromUrl: false,
    });
    expect(parseAccountInput('elonmusk', 'x')?.platform).toBe('x');
  });

  it('detects Threads from a profile URL', () => {
    expect(parseAccountInput('https://www.threads.com/@zuck', 'x')).toEqual({
      username: 'zuck',
      platform: 'threads',
      fromUrl: true,
    });
    // bare host without scheme + post path
    expect(parseAccountInput('threads.net/@autogod.ai/post/ABC', 'x')).toEqual({
      username: 'autogod.ai',
      platform: 'threads',
      fromUrl: true,
    });
  });

  it('detects X from x.com / twitter.com URLs and strips status paths', () => {
    expect(parseAccountInput('https://x.com/elonmusk', 'threads')).toEqual({
      username: 'elonmusk',
      platform: 'x',
      fromUrl: true,
    });
    expect(parseAccountInput('https://twitter.com/jack/status/123', 'threads')?.username).toBe('jack');
  });

  it('ignores reserved x.com paths', () => {
    expect(parseAccountInput('https://x.com/home', 'threads')).toBeNull();
    expect(parseAccountInput('https://x.com/i/bookmarks', 'threads')).toBeNull();
  });

  it('returns null for an unrecognized URL host', () => {
    expect(parseAccountInput('https://instagram.com/zuck', 'threads')).toBeNull();
  });
});
