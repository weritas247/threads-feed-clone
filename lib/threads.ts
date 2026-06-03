import { parseProfileHtml } from './parse';
import type { ScrapeResult } from './types';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@+/, '');
}

// Resolve just an account's avatar — independent of a full feed crawl — via the
// lightweight Instagram web_profile_info endpoint (Threads shares Instagram
// accounts, so the profile picture is the same). Returns null on any failure.
export async function fetchProfileAvatar(username: string): Promise<string | null> {
  const handle = normalizeUsername(username);
  if (!handle) return null;
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'X-IG-App-ID': '936619743392459',
        'User-Agent': BROWSER_HEADERS['User-Agent'],
        Referer: 'https://www.instagram.com/',
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { user?: { profile_pic_url_hd?: string; profile_pic_url?: string } };
    };
    const user = json.data?.user;
    return user?.profile_pic_url_hd ?? user?.profile_pic_url ?? null;
  } catch {
    return null;
  }
}

export async function fetchAccountFeed(username: string): Promise<ScrapeResult> {
  const handle = normalizeUsername(username);
  const url = `https://www.threads.com/@${handle}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: BROWSER_HEADERS });
  } catch {
    return { ok: false, reason: 'blocked' };
  }
  if (res.status === 404) return { ok: false, reason: 'not_found' };
  if (!res.ok) return { ok: false, reason: 'blocked' };
  const html = await res.text();
  const posts = parseProfileHtml(html, handle);
  if (posts.length === 0) {
    // A private profile renders no posts but still embeds the owner's private flag.
    if (/"text_post_app_is_private":\s*true/.test(html)) return { ok: false, reason: 'private' };
    return { ok: false, reason: 'parse_error' };
  }
  return { ok: true, posts };
}
