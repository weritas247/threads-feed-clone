import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Post, Media } from './types';

// Media archiving: download images/videos to data/media/ at CRAWL time (the only safe
// window — Threads/X CDN URLs are signed and expire within hours). Stored posts then
// reference a local serving path, so the archive doesn't rot when the source expires.
// Fully best-effort: any failure falls back to the original hotlink URL, and the whole
// step is guarded so it can never break a crawl.

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80 MB
const FETCH_TIMEOUT_MS = 15_000;

// Only known media CDNs (SSRF guard for a tool that fetches arbitrary URLs server-side).
const ALLOWED_HOST_SUFFIXES = [
  'cdninstagram.com',
  'fbcdn.net',
  'twimg.com',
];

export function isArchivableUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    return ALLOWED_HOST_SUFFIXES.some((s) => u.hostname === s || u.hostname.endsWith('.' + s));
  } catch {
    return false;
  }
}

// Already-local serving path? (so re-archiving is a no-op and we never re-download).
export function isLocalMedia(url: string): boolean {
  return url.startsWith('/api/media?f=');
}

function mediaDir(): string {
  const base = process.env.ACCOUNTS_DATA_DIR ?? join(process.cwd(), 'data');
  const dir = join(base, 'media');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

// Deterministic filename from the URL (so the same media archives once). Extension from
// the URL path when present, refined by content-type at download time.
export function mediaFilename(url: string, contentType?: string): string {
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 20);
  let ext = '';
  const fromType = contentType ? EXT_BY_TYPE[contentType.split(';')[0].trim()] : '';
  if (fromType) ext = fromType;
  else {
    const m = url.split('?')[0].match(/\.([a-z0-9]{2,4})$/i);
    ext = m ? m[1].toLowerCase() : 'bin';
  }
  return `${hash}.${ext}`;
}

// Sanitize a requested filename for the serving route — defeat path traversal.
export function safeMediaName(name: string): string | null {
  if (!/^[a-z0-9]{20}\.[a-z0-9]{2,4}$/i.test(name)) return null;
  return name;
}

export function localMediaPath(filename: string): string {
  return join(mediaDir(), filename);
}

// Read an archived file for the serving route. Returns null if missing/invalid.
export function readMedia(name: string): { buf: Buffer; contentType: string } | null {
  const safe = safeMediaName(name);
  if (!safe) return null;
  const path = localMediaPath(safe);
  if (!existsSync(path)) return null;
  const ext = safe.split('.').pop() ?? '';
  const contentType =
    Object.entries(EXT_BY_TYPE).find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream';
  return { buf: readFileSync(path), contentType };
}

async function downloadOne(url: string, isVideo: boolean): Promise<string | null> {
  if (!isArchivableUrl(url)) return null;
  // Probe filename from URL first; if it already exists (any ext), reuse it.
  const provisional = mediaFilename(url);
  const probe = localMediaPath(provisional);
  if (existsSync(probe)) return `/api/media?f=${provisional}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    const buf = Buffer.from(await res.arrayBuffer());
    const cap = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (buf.byteLength === 0 || buf.byteLength > cap) return null;
    const filename = mediaFilename(url, contentType);
    writeFileSync(localMediaPath(filename), buf);
    return `/api/media?f=${filename}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, worker));
  return out;
}

// Rewrite a post's media (and its chain's) to local archived paths where possible. Avatar
// is left hotlinked (small, refreshed each crawl). Best-effort: failures keep the original
// URL. Returns a new Post; never throws.
async function archiveMediaList(media: Media[] | undefined): Promise<Media[]> {
  if (!media || !media.length) return media ?? [];
  const archived = await mapLimit(media, 4, async (m) => {
    if (isLocalMedia(m.url)) return m;
    const local = await downloadOne(m.url, m.type === 'video');
    return local ? { ...m, url: local } : m;
  });
  return archived;
}

export async function archivePost(post: Post): Promise<Post> {
  try {
    const media = await archiveMediaList(post.media);
    const chain = post.chain?.length
      ? await Promise.all(post.chain.map(async (c) => ({ ...c, media: await archiveMediaList(c.media) })))
      : post.chain;
    return { ...post, media, chain };
  } catch {
    return post;
  }
}

// Archive media across a batch of posts. Guarded — returns originals on any failure so a
// crawl is never broken by archiving. Off unless ARCHIVE_MEDIA is set (opt-in), since it
// adds download time to each crawl.
export async function archivePosts(posts: Post[]): Promise<Post[]> {
  if (process.env.ARCHIVE_MEDIA !== '1') return posts;
  try {
    return await Promise.all(posts.map(archivePost));
  } catch {
    return posts;
  }
}

// How much has been archived (for the stats/manage surface).
export function mediaArchiveStats(): { files: number; bytes: number } {
  try {
    const dir = mediaDir();
    const files = readdirSync(dir);
    let bytes = 0;
    for (const f of files) {
      try {
        bytes += statSync(join(dir, f)).size;
      } catch {
        /* skip */
      }
    }
    return { files: files.length, bytes };
  } catch {
    return { files: 0, bytes: 0 };
  }
}
