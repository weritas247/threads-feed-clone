import { describe, it, expect } from 'vitest';
import { isArchivableUrl, isLocalMedia, mediaFilename, safeMediaName, archivePost } from './mediaArchive';
import type { Post } from './types';

describe('isArchivableUrl', () => {
  it('accepts known media CDNs over http(s)', () => {
    expect(isArchivableUrl('https://scontent.cdninstagram.com/a.jpg')).toBe(true);
    expect(isArchivableUrl('https://pbs.twimg.com/media/x.jpg')).toBe(true);
    expect(isArchivableUrl('https://video.twimg.com/x.mp4')).toBe(true);
  });
  it('rejects unknown hosts and non-http protocols (SSRF guard)', () => {
    expect(isArchivableUrl('https://evil.example.com/a.jpg')).toBe(false);
    expect(isArchivableUrl('file:///etc/passwd')).toBe(false);
    expect(isArchivableUrl('not a url')).toBe(false);
  });
  it('does not match a suffix-spoofing host', () => {
    expect(isArchivableUrl('https://twimg.com.evil.com/a.jpg')).toBe(false);
  });
});

describe('isLocalMedia', () => {
  it('detects our serving path', () => {
    expect(isLocalMedia('/api/media?f=abc.jpg')).toBe(true);
    expect(isLocalMedia('https://pbs.twimg.com/x.jpg')).toBe(false);
  });
});

describe('mediaFilename', () => {
  it('is deterministic and uses content-type extension when given', () => {
    const a = mediaFilename('https://pbs.twimg.com/x', 'image/png');
    const b = mediaFilename('https://pbs.twimg.com/x', 'image/png');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{20}\.png$/);
  });
  it('falls back to the URL path extension', () => {
    expect(mediaFilename('https://pbs.twimg.com/x.webp')).toMatch(/\.webp$/);
  });
});

describe('safeMediaName', () => {
  it('accepts a valid hash.ext and rejects traversal', () => {
    expect(safeMediaName('0123456789abcdef0123.jpg')).toBe('0123456789abcdef0123.jpg');
    expect(safeMediaName('../../etc/passwd')).toBeNull();
    expect(safeMediaName('abc.jpg')).toBeNull(); // too short hash
  });
});

describe('archivePost', () => {
  // Regression: a chain post with no media field used to throw and revert the WHOLE post
  // to its original (remote) URLs even after the main media downloaded. Non-archivable
  // URLs do no network, so this stays a pure unit test.
  it('does not throw when a chain post has undefined media, and leaves non-CDN urls', async () => {
    const post = {
      id: '1',
      code: '1',
      platform: 'threads',
      permalink: '',
      author: { username: 'u', displayName: 'U', avatarUrl: '', verified: false },
      text: 't',
      createdAt: 0,
      media: [{ type: 'image', url: 'https://example.com/x.jpg', width: 1, height: 1 }],
      stats: { likes: 0, replies: 0, reposts: 0, shares: 0 },
      chain: [{ id: '2', text: 'c' } as unknown as Post],
    } as Post;
    const out = await archivePost(post);
    expect(out.media[0].url).toBe('https://example.com/x.jpg'); // non-CDN → untouched, no throw
    expect(out.chain[0].media).toEqual([]); // undefined chain media normalized, not thrown
  });
});
