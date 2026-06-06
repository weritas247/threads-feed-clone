import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Platform } from './types';

// File-backed collections: named groups of posts above the flat tag layer — a "project",
// "reading list", or research bundle. A collection holds an ordered list of post keys
// (`platform:id`) plus an optional saved synthesis note (the AI-generated summary of the
// bundle). Stored in data/collections.json. Server-only; dir overridable via
// ACCOUNTS_DATA_DIR (shared with the other stores; tests use it).

export interface Collection {
  id: string;
  name: string;
  createdAt: number; // unix seconds
  postKeys: string[]; // `platform:id`, insertion order (manual collections)
  note: string; // saved synthesis (empty until generated)
  query?: string; // a saved search string (URL params) → SMART collection, resolved live
}

type CollectionMap = Record<string, Collection>;

function collectionsFile(): string {
  const base = process.env.ACCOUNTS_DATA_DIR ?? join(process.cwd(), 'data');
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return join(base, 'collections.json');
}

export const postKey = (platform: Platform, id: string): string => `${platform}:${id}`;

function load(): CollectionMap {
  const file = collectionsFile();
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as CollectionMap;
  } catch {
    return {};
  }
}

function save(map: CollectionMap): void {
  writeFileSync(collectionsFile(), JSON.stringify(map));
}

// Monotonic-ish unique id. now() + random keeps it unique across a fast burst without a
// counter; collections are user-paced so collisions are effectively impossible.
function newId(): string {
  return `c_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function listCollections(): Collection[] {
  return Object.values(load()).sort((a, b) => b.createdAt - a.createdAt);
}

export function getCollection(id: string): Collection | undefined {
  return load()[id];
}

// Create a collection. Pass `query` (a saved search string) to make a SMART collection
// that resolves to matching posts live instead of holding a manual list.
export function createCollection(name: string, query?: string): Collection {
  const map = load();
  const c: Collection = {
    id: newId(),
    name: name.trim() || (query ? '저장된 검색' : 'Untitled'),
    createdAt: Math.floor(Date.now() / 1000),
    postKeys: [],
    note: '',
    ...(query ? { query } : {}),
  };
  map[c.id] = c;
  save(map);
  return c;
}

export function renameCollection(id: string, name: string): Collection | undefined {
  const map = load();
  const c = map[id];
  if (!c) return undefined;
  c.name = name.trim() || c.name;
  save(map);
  return c;
}

export function deleteCollection(id: string): boolean {
  const map = load();
  if (!map[id]) return false;
  delete map[id];
  save(map);
  return true;
}

// Add a post (idempotent — no duplicates, preserves first-insertion order).
export function addToCollection(id: string, platform: Platform, postId: string): Collection | undefined {
  const map = load();
  const c = map[id];
  if (!c) return undefined;
  const k = postKey(platform, postId);
  if (!c.postKeys.includes(k)) c.postKeys.push(k);
  save(map);
  return c;
}

export function removeFromCollection(id: string, key: string): Collection | undefined {
  const map = load();
  const c = map[id];
  if (!c) return undefined;
  c.postKeys = c.postKeys.filter((k) => k !== key);
  save(map);
  return c;
}

export function setCollectionNote(id: string, note: string): Collection | undefined {
  const map = load();
  const c = map[id];
  if (!c) return undefined;
  c.note = note;
  save(map);
  return c;
}

// Which collections contain a given post — for the card's "in N collections" state.
export function collectionsForPost(platform: Platform, postId: string): Collection[] {
  const k = postKey(platform, postId);
  return listCollections().filter((c) => c.postKeys.includes(k));
}
