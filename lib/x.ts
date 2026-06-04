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

// --- Logged-in x.com GraphQL (Bookmarks, etc.) ---------------------------------
// The public syndication embed (parseXTimeline) and x.com's own GraphQL API return
// different shapes. The Chrome extension captures GraphQL responses, where each
// tweet sits under a `tweet_results.result` carrying a `legacy` block (≈ RawTweet)
// plus a `core.user_results.result` author. This walks arbitrary nesting, finds
// those results, and reuses the tweet mappers. No login here — we only parse
// responses the logged-in browser already fetched.

interface XUserResult {
  is_blue_verified?: boolean;
  legacy?: { screen_name?: string; name?: string; profile_image_url_https?: string; verified?: boolean };
  core?: { screen_name?: string; name?: string };
  avatar?: { image_url?: string };
}
interface XTweetResult {
  rest_id?: string;
  legacy?: RawTweet;
  tweet?: XTweetResult; // TweetWithVisibilityResults wraps the real tweet here
  core?: { user_results?: { result?: XUserResult } };
}

// X has moved author fields around over time; read both the old `legacy` shape and
// the newer `core`/`avatar` shape.
function userFromResult(ur: XUserResult | undefined): RawTweet['user'] {
  if (!ur) return undefined;
  const lg = ur.legacy ?? {};
  const core = ur.core ?? {};
  return {
    screen_name: core.screen_name ?? lg.screen_name,
    name: core.name ?? lg.name,
    profile_image_url_https: ur.avatar?.image_url ?? lg.profile_image_url_https,
    verified: lg.verified,
    is_blue_verified: ur.is_blue_verified,
  };
}

function collectTweetResults(node: unknown, acc: XTweetResult[], depth = 0): void {
  if (!node || typeof node !== 'object' || depth > 30) return;
  if (Array.isArray(node)) {
    for (const x of node) collectTweetResults(x, acc, depth + 1);
    return;
  }
  const obj = node as XTweetResult & Record<string, unknown>;
  // Limited-visibility tweets nest the real one under `.tweet`.
  const real = obj.tweet && typeof obj.tweet === 'object' ? obj.tweet : obj;
  if (real.legacy && (real.rest_id || real.legacy.id_str)) acc.push(real);
  for (const k of Object.keys(obj)) collectTweetResults(obj[k], acc, depth + 1);
}

function mapXResult(r: XTweetResult): Post | null {
  const legacy = r.legacy ?? {};
  const id = r.rest_id ?? legacy.id_str;
  if (!id) return null;
  const user = userFromResult(r.core?.user_results?.result);
  if (!user?.screen_name) return null; // skip tweets whose author didn't resolve
  return mapTweet({ ...legacy, id_str: String(id), user });
}

export function collectXPostsFromData(data: unknown): Post[] {
  const results: XTweetResult[] = [];
  collectTweetResults(data, results);
  const byId = new Map<string, Post>();
  for (const r of results) {
    const post = mapXResult(r);
    if (post && !byId.has(post.id)) byId.set(post.id, post);
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
