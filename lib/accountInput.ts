import type { Platform } from './types';

export interface ParsedAccount {
  username: string;
  platform: Platform;
  fromUrl: boolean; // true when the platform was detected from a pasted URL
}

// x.com path segments that are not usernames.
const X_RESERVED = new Set([
  'home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings',
  'compose', 'bookmarks', 'hashtag', 'lists', 'communities', 'jobs', 'login',
  'signup', 'tos', 'privacy', 'about', 'intent', 'share', 'account', 'status',
  'following', 'followers', 'verified_followers', 'web',
]);

// Parse the "Add account" input into a (username, platform). If it's a profile URL on a
// known platform, the platform is detected from the host (overriding `fallback`);
// otherwise it's treated as a bare handle using `fallback`. Returns null for empty input
// or an unrecognized URL host.
export function parseAccountInput(raw: string, fallback: Platform): ParsedAccount | null {
  const input = (raw ?? '').trim();
  if (!input) return null;

  const looksLikeUrl =
    /^https?:\/\//i.test(input) || /\b(threads\.(com|net)|x\.com|twitter\.com)\//i.test(input);

  if (looksLikeUrl) {
    let host: string;
    let path: string;
    try {
      const u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
      host = u.hostname.toLowerCase();
      path = u.pathname;
    } catch {
      return null;
    }
    if (/(^|\.)threads\.(com|net)$/.test(host)) {
      const m = path.match(/\/@?([A-Za-z0-9._]+)/);
      if (m) return { username: m[1].toLowerCase(), platform: 'threads', fromUrl: true };
    }
    if (/(^|\.)(x|twitter)\.com$/.test(host)) {
      const seg = path.split('/').filter(Boolean)[0];
      if (seg && !X_RESERVED.has(seg.toLowerCase())) {
        return { username: seg.replace(/^@+/, '').toLowerCase(), platform: 'x', fromUrl: true };
      }
    }
    return null; // a URL, but not a recognized profile
  }

  const handle = input.replace(/^@+/, '').trim();
  if (!handle) return null;
  return { username: handle.toLowerCase(), platform: fallback, fromUrl: false };
}
