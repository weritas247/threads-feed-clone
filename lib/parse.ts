import type { Author, Media, Post, Stats } from './types';

export function extractJsonScripts(html: string): string[] {
  const re = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1]);
  }
  return out;
}

interface RawCandidate { url: string; width: number; height: number; }
interface RawPost {
  pk?: string; id?: string; code?: string; taken_at?: number; like_count?: number;
  media_type?: number; accessibility_caption?: string;
  caption?: { text?: string } | null;
  user?: {
    username?: string; full_name?: string; profile_pic_url?: string; is_verified?: boolean;
  };
  text_post_app_info?: {
    direct_reply_count?: number; repost_count?: number; reshare_count?: number;
  } | null;
  image_versions2?: { candidates?: RawCandidate[] } | null;
  video_versions?: { url: string; width?: number; height?: number }[] | null;
  carousel_media?: RawPost[] | null;
}
interface RawThread { thread_items?: { post?: RawPost }[]; id?: string }

function collectThreads(node: unknown, acc: RawThread[]): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectThreads(item, acc);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj.thread_items)) acc.push(obj as RawThread);
  for (const key of Object.keys(obj)) collectThreads(obj[key], acc);
}

function pickImage(p: RawPost): Media | null {
  const candidates = p.image_versions2?.candidates;
  if (!candidates || candidates.length === 0) return null;
  const best = candidates.reduce((a, b) => (b.width > a.width ? b : a));
  return { type: 'image', url: best.url, width: best.width, height: best.height, alt: p.accessibility_caption };
}

function buildSingleMedia(p: RawPost): Media | null {
  if (p.video_versions && p.video_versions.length > 0) {
    const v = p.video_versions[0];
    return { type: 'video', url: v.url, width: v.width ?? 0, height: v.height ?? 0, alt: p.accessibility_caption };
  }
  return pickImage(p);
}

function buildMedia(p: RawPost): Media[] {
  if (p.carousel_media && p.carousel_media.length > 0) {
    return p.carousel_media.map(buildSingleMedia).filter((m): m is Media => m !== null);
  }
  const single = buildSingleMedia(p);
  return single ? [single] : [];
}

function mapAuthor(u: RawPost['user']): Author {
  return {
    username: u?.username ?? '',
    displayName: u?.full_name ?? u?.username ?? '',
    avatarUrl: u?.profile_pic_url ?? '',
    verified: Boolean(u?.is_verified),
  };
}

function mapStats(p: RawPost): Stats {
  const t = p.text_post_app_info ?? {};
  return {
    likes: p.like_count ?? 0,
    replies: t.direct_reply_count ?? 0,
    reposts: t.repost_count ?? 0,
    shares: t.reshare_count ?? 0,
  };
}

function mapPost(p: RawPost): Post | null {
  if (!p.pk && !p.id) return null;
  return {
    id: String(p.pk ?? p.id),
    code: p.code ?? '',
    author: mapAuthor(p.user),
    text: p.caption?.text ?? '',
    createdAt: p.taken_at ?? 0,
    media: buildMedia(p),
    stats: mapStats(p),
    chain: [],
  };
}

// A profile page also embeds recommended/related threads from OTHER accounts.
// When `username` is provided, keep only threads whose lead post is by that account.
export function parseProfileHtml(html: string, username?: string): Post[] {
  const wanted = username ? username.trim().replace(/^@+/, '').toLowerCase() : null;
  const threads: RawThread[] = [];
  for (const block of extractJsonScripts(html)) {
    let data: unknown;
    try { data = JSON.parse(block); } catch { continue; }
    collectThreads(data, threads);
  }
  const byId = new Map<string, Post>();
  for (const thread of threads) {
    const items = (thread.thread_items ?? []).map((i) => i.post).filter((p): p is RawPost => !!p);
    if (items.length === 0) continue;
    const lead = mapPost(items[0]);
    if (!lead) continue;
    if (wanted && lead.author.username.toLowerCase() !== wanted) continue;
    lead.chain = items.slice(1).map(mapPost).filter((p): p is Post => p !== null);
    if (!byId.has(lead.id)) byId.set(lead.id, lead);
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}
