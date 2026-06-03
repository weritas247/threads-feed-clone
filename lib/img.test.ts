import { describe, it, expect } from 'vitest';
import { isAllowedImageHost, proxied } from './img';

describe('isAllowedImageHost', () => {
  it('allows Threads/Instagram/X CDN hosts', () => {
    expect(isAllowedImageHost('https://scontent-icn2-1.cdninstagram.com/v/x.jpg')).toBe(true);
    expect(isAllowedImageHost('https://video.fbcdn.net/v/x.mp4')).toBe(true);
    expect(isAllowedImageHost('https://pbs.twimg.com/media/abc.jpg')).toBe(true);
    expect(isAllowedImageHost('https://video.twimg.com/x.mp4')).toBe(true);
  });
  it('rejects other hosts and malformed urls', () => {
    expect(isAllowedImageHost('https://evil.com/x.jpg')).toBe(false);
    expect(isAllowedImageHost('https://notcdninstagram.com.evil.com/x')).toBe(false);
    expect(isAllowedImageHost('not a url')).toBe(false);
  });
});

describe('proxied', () => {
  it('routes http(s) urls through the image proxy', () => {
    expect(proxied('https://scontent.cdninstagram.com/a.jpg')).toBe(
      '/api/img?url=' + encodeURIComponent('https://scontent.cdninstagram.com/a.jpg'),
    );
  });
  it('leaves empty or relative values untouched', () => {
    expect(proxied('')).toBe('');
    expect(proxied('/local.png')).toBe('/local.png');
  });
});
