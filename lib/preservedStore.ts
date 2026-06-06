import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Platform, Post } from './types';

// Tracks posts that were captured before but have since DISAPPEARED from the source
// (deleted/hidden at Threads/X). The archive still has them — so instead of a liability,
// a vanished post becomes a feature: "preserved, gone from the original". Stored as a set
// of `platform:id` in data/preserved.json. Server-only; dir via ACCOUNTS_DATA_DIR.

function preservedFile(): string {
  const base = process.env.ACCOUNTS_DATA_DIR ?? join(process.cwd(), 'data');
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return join(base, 'preserved.json');
}

const keyOf = (platform: Platform, id: string): string => `${platform}:${id}`;

export function getPreservedKeys(): Set<string> {
  const file = preservedFile();
  if (!existsSync(file)) return new Set();
  try {
    return new Set(JSON.parse(readFileSync(file, 'utf8')) as string[]);
  } catch {
    return new Set();
  }
}

function save(set: Set<string>): void {
  writeFileSync(preservedFile(), JSON.stringify([...set]));
}

export function isPreserved(platform: Platform, id: string): boolean {
  return getPreservedKeys().has(keyOf(platform, id));
}

// Reconcile one account's crawl: posts we HAD stored but that the fresh crawl did NOT
// return are now gone-at-source → mark preserved. Posts that reappear are un-marked.
// `storedIds` / `fetchedIds` are the post ids (not keys) for this account+platform.
export function reconcilePreservation(
  platform: Platform,
  storedIds: string[],
  fetchedIds: string[],
): { newlyPreserved: number } {
  const fetched = new Set(fetchedIds);
  const set = getPreservedKeys();
  let newlyPreserved = 0;
  for (const id of storedIds) {
    const k = keyOf(platform, id);
    if (!fetched.has(id)) {
      if (!set.has(k)) {
        set.add(k);
        newlyPreserved++;
      }
    } else if (set.has(k)) {
      set.delete(k); // reappeared
    }
  }
  save(set);
  return { newlyPreserved };
}

// Keep only posts that are NOT preserved-elsewhere... actually used the other way: filter
// a list to preserved-only, for a potential "preserved" view. Mostly the badge uses the set.
export function filterPreserved(posts: Post[]): Post[] {
  const set = getPreservedKeys();
  return posts.filter((p) => set.has(keyOf(p.platform, p.id)));
}
