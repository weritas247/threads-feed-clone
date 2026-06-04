import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Platform, Post } from './types';
import { threadPostUrl, xPostUrl } from './links';

// File-backed store for bookmarked ("Saved") posts the user imports from their own
// Threads account via the Saved bookmarklet. Unlike postStore (per-account feeds),
// these span many authors, so they live in a single data/bookmarks.json, deduped
// by platform:id and kept newest-first. No database. Server-only (node:fs). Data
// dir overridable via ACCOUNTS_DATA_DIR (shared with the other stores; tests use it).

function hydrate(p: Post): Post {
  const platform: Platform = p.platform ?? 'threads';
  const permalink =
    p.permalink ??
    (platform === 'x' ? xPostUrl(p.author.username, p.code) : threadPostUrl(p.author.username, p.code));
  return { ...p, platform, permalink };
}

function bookmarksFile(): string {
  const base = process.env.ACCOUNTS_DATA_DIR ?? join(process.cwd(), 'data');
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return join(base, 'bookmarks.json');
}

const keyOf = (p: Post): string => `${p.platform}:${p.id}`;

export function getBookmarks(): Post[] {
  const file = bookmarksFile();
  if (!existsSync(file)) return [];
  try {
    return (JSON.parse(readFileSync(file, 'utf8')) as Post[])
      .map(hydrate)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

// Merge `posts` into the saved bookmarks (new data wins on collision), sort
// newest-first, persist, and report how many were newly added plus the new total.
export function addBookmarks(posts: Post[]): { added: number; total: number } {
  const byKey = new Map<string, Post>();
  for (const p of getBookmarks()) byKey.set(keyOf(p), p);
  const before = byKey.size;
  for (const p of posts.map(hydrate)) byKey.set(keyOf(p), p);
  const merged = [...byKey.values()].sort((a, b) => b.createdAt - a.createdAt);
  writeFileSync(bookmarksFile(), JSON.stringify(merged));
  return { added: merged.length - before, total: merged.length };
}

export function clearBookmarks(): void {
  writeFileSync(bookmarksFile(), JSON.stringify([]));
}

// The set of `platform:id` keys currently bookmarked — for rendering the save
// button's filled/empty state across the feed without N store reads.
export function bookmarkedKeys(): Set<string> {
  return new Set(getBookmarks().map(keyOf));
}

// Save a single post (used by the in-feed save button). Returns the new total.
export function addBookmark(post: Post): number {
  return addBookmarks([post]).total;
}

// Remove a single post by platform + id. Returns the new total.
export function removeBookmark(platform: Platform, id: string): number {
  const key = `${platform}:${id}`;
  const remaining = getBookmarks().filter((p) => keyOf(p) !== key);
  writeFileSync(bookmarksFile(), JSON.stringify(remaining));
  return remaining.length;
}
