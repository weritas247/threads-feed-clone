import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Post } from './types';

// File-backed store for crawled posts. Each account's posts accumulate across
// crawls in data/posts/<username>.json, deduplicated by post id and kept
// newest-first. No database. Server-only (node:fs). Data dir overridable via
// ACCOUNTS_DATA_DIR (shared with accountStore; used by tests).

function postsDir(): string {
  const base = process.env.ACCOUNTS_DATA_DIR ?? join(process.cwd(), 'data');
  const dir = join(base, 'posts');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function safeName(username: string): string {
  return username.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9._-]/g, '_');
}

function fileFor(username: string): string {
  return join(postsDir(), `${safeName(username)}.json`);
}

export function getSavedPosts(username: string): Post[] {
  const file = fileFor(username);
  if (!existsSync(file)) return [];
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Post[];
  } catch {
    return [];
  }
}

// Merge `posts` into the saved set (new data wins on id collision), sort
// newest-first, persist, and return the total saved count.
export function savePosts(username: string, posts: Post[]): number {
  const byId = new Map<string, Post>();
  for (const p of getSavedPosts(username)) byId.set(p.id, p);
  for (const p of posts) byId.set(p.id, p);
  const merged = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
  writeFileSync(fileFor(username), JSON.stringify(merged));
  return merged.length;
}
