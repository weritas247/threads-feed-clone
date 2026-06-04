import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Platform, Post } from './types';
import { normalizeTag } from './accountStore';

// File-backed per-POST tags. Crucially these live OUTSIDE the post objects: postStore
// overwrites posts on every crawl (deduped by id), so an inline tag would be lost.
// Keyed by `platform:id` in data/postTags.json, tags survive re-crawls and span feeds.
// Server-only. Dir overridable via ACCOUNTS_DATA_DIR (shared with the other stores).

type TagMap = Record<string, string[]>;

function tagsFile(): string {
  const base = process.env.ACCOUNTS_DATA_DIR ?? join(process.cwd(), 'data');
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return join(base, 'postTags.json');
}

const keyOf = (platform: Platform, id: string): string => `${platform}:${id}`;

export function getTagMap(): TagMap {
  const file = tagsFile();
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as TagMap;
  } catch {
    return {};
  }
}

function save(map: TagMap): void {
  writeFileSync(tagsFile(), JSON.stringify(map));
}

export function getPostTags(platform: Platform, id: string): string[] {
  return getTagMap()[keyOf(platform, id)] ?? [];
}

export function addPostTag(platform: Platform, id: string, tag: string): string[] {
  const tg = normalizeTag(tag);
  const map = getTagMap();
  const k = keyOf(platform, id);
  if (!tg) return map[k] ?? [];
  const next = [...new Set([...(map[k] ?? []), tg])];
  map[k] = next;
  save(map);
  return next;
}

export function removePostTag(platform: Platform, id: string, tag: string): string[] {
  const tg = normalizeTag(tag);
  const map = getTagMap();
  const k = keyOf(platform, id);
  const next = (map[k] ?? []).filter((t) => t !== tg);
  if (next.length) map[k] = next;
  else delete map[k];
  save(map);
  return next;
}

// Distinct tag → number of posts carrying it, for tag discovery / browse UIs.
export function tagCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const tags of Object.values(getTagMap())) {
    for (const t of tags) out[t] = (out[t] ?? 0) + 1;
  }
  return out;
}

export function allPostTags(): string[] {
  return Object.keys(tagCounts()).sort();
}

// Parse a comma-separated `ptag` URL param into normalized, deduped tags.
export function parseTagParam(value: string | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map(normalizeTag).filter(Boolean))];
}

// Keep only posts carrying EVERY given tag (AND filter). Empty `tags` is a no-op.
export function filterPostsByTags(posts: Post[], tags: string[], map: Record<string, string[]> = getTagMap()): Post[] {
  const want = tags.map(normalizeTag).filter(Boolean);
  if (want.length === 0) return posts;
  return posts.filter((p) => {
    const have = map[keyOf(p.platform, p.id)] ?? [];
    return want.every((t) => have.includes(t));
  });
}

// Distinct tags present among a specific set of posts (sorted) — for scoping a feed's
// filter bar to only the tags that actually appear in it (e.g. a single account).
export function tagsForPosts(posts: Post[], map: Record<string, string[]> = getTagMap()): string[] {
  const set = new Set<string>();
  for (const p of posts) {
    for (const t of map[keyOf(p.platform, p.id)] ?? []) set.add(t);
  }
  return [...set].sort();
}

// The set of `platform:id` keys carrying a given tag — for filtering a post list.
export function keysWithTag(tag: string): Set<string> {
  const tg = normalizeTag(tag);
  const set = new Set<string>();
  if (!tg) return set;
  for (const [k, tags] of Object.entries(getTagMap())) {
    if (tags.includes(tg)) set.add(k);
  }
  return set;
}
