import type { Author, Media, Post, ScrapeResult, Stats } from './types';
import { xPostUrl } from './links';

// X (Twitter) feeds via the public embed syndication endpoint, which serves a
// profile timeline without login. The page embeds the data in a __NEXT_DATA__
// script. This is the only X-specific, swappable unit — like lib/threads.ts.

const X_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export function normalizeXHandle(input: string): string {
  return input.trim().replace(/^@+/, '');
}

interface RawXMediaVariant { bitrate?: number; content_type?: string; url: string }
interface RawXMedia {
  type?: string;
  media_url_https?: string;
  original_info?: { width?: number; height?: number };
  video_info?: { variants?: RawXMediaVariant[] };
  ext_alt_text?: string;
}
interface RawTweet {
  id_str?: string;
  full_text?: string;
  text?: string;
  created_at?: string;
  favorite_count?: number;
  reply_count?: number;
  retweet_count?: number;
  quote_count?: number;
  entities?: { media?: RawXMedia[] };
  extended_entities?: { media?: RawXMedia[] };
  user?: {
    screen_name?: string;
    name?: string;
    profile_image_url_https?: string;
    verified?: boolean;
    is_blue_verified?: boolean;
  };
}

function findEntries(node: unknown, depth = 0): unknown[] | null {
  if (!node || typeof node !== 'object' || depth > 10) return null;
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj.entries)) return obj.entries;
  for (const k of Object.keys(obj)) {
    const r = findEntries(obj[k], depth + 1);
    if (r) return r;
  }
  return null;
}

function mapXMedia(t: RawTweet): Media[] {
  const list = t.extended_entities?.media ?? t.entities?.media ?? [];
  const out: Media[] = [];
  for (const m of list) {
    const width = m.original_info?.width ?? 0;
    const height = m.original_info?.height ?? 0;
    if ((m.type === 'video' || m.type === 'animated_gif') && m.video_info?.variants) {
      const mp4s = m.video_info.variants.filter((v) => v.content_type === 'video/mp4');
      const best = mp4s.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
      if (best) out.push({ type: 'video', url: best.url, width, height, alt: m.ext_alt_text });
    } else if (m.media_url_https) {
      out.push({ type: 'image', url: m.media_url_https, width, height, alt: m.ext_alt_text });
    }
  }
  return out;
}

function mapAuthor(u: RawTweet['user']): Author {
  return {
    username: u?.screen_name ?? '',
    displayName: u?.name ?? u?.screen_name ?? '',
    // _normal is a 48px thumbnail; _400x400 is a crisp avatar.
    avatarUrl: (u?.profile_image_url_https ?? '').replace('_normal', '_400x400'),
    verified: Boolean(u?.verified || u?.is_blue_verified),
  };
}

function mapStats(t: RawTweet): Stats {
  return {
    likes: t.favorite_count ?? 0,
    replies: t.reply_count ?? 0,
    reposts: t.retweet_count ?? 0,
    shares: t.quote_count ?? 0,
  };
}

// X appends the media's own t.co URL to full_text; strip a single trailing one.
function cleanText(text: string): string {
  return text.replace(/\s+https:\/\/t\.co\/\w+\s*$/, '').trim();
}

function mapTweet(t: RawTweet): Post | null {
  if (!t.id_str) return null;
  const author = mapAuthor(t.user);
  const id = String(t.id_str);
  const created = t.created_at ? Date.parse(t.created_at) : NaN;
  return {
    id,
    code: id,
    platform: 'x',
    permalink: xPostUrl(author.username, id),
    author,
    text: cleanText(t.full_text ?? t.text ?? ''),
    createdAt: Number.isNaN(created) ? 0 : Math.floor(created / 1000),
    media: mapXMedia(t),
    stats: mapStats(t),
    chain: [],
  };
}

export function parseXTimeline(html: string, username?: string): Post[] {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];
  let data: unknown;
  try {
    data = JSON.parse(m[1]);
  } catch {
    return [];
  }
  const entries = findEntries(data) ?? [];
  const wanted = username ? normalizeXHandle(username).toLowerCase() : null;
  const byId = new Map<string, Post>();
  for (const e of entries) {
    const tweet = (e as { content?: { tweet?: RawTweet } })?.content?.tweet;
    if (!tweet) continue;
    const post = mapTweet(tweet);
    if (!post) continue;
    if (wanted && post.author.username.toLowerCase() !== wanted) continue;
    if (!byId.has(post.id)) byId.set(post.id, post);
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function fetchXAccountFeed(username: string): Promise<ScrapeResult> {
  const handle = normalizeXHandle(username);
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(handle)}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: X_HEADERS });
  } catch {
    return { ok: false, reason: 'blocked' };
  }
  if (res.status === 404) return { ok: false, reason: 'not_found' };
  if (!res.ok) return { ok: false, reason: 'blocked' };
  const html = await res.text();
  const posts = parseXTimeline(html, handle);
  if (posts.length === 0) return { ok: false, reason: 'parse_error' };
  return { ok: true, posts };
}

export async function fetchXProfileAvatar(username: string): Promise<string | null> {
  const result = await fetchXAccountFeed(username);
  return result.ok ? (result.posts[0]?.author.avatarUrl ?? null) : null;
}
