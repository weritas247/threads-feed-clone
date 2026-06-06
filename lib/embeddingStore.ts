import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Platform } from './types';

// File-backed semantic vectors, one per post, keyed by `platform:id` — same external-
// store pattern as tags/notes/enrichment so they survive re-crawls. Each record also
// stores the embedder `id` that produced it; vectors from different backends aren't
// comparable, so search filters to the current embedder's id. Server-only.
// Dir overridable via ACCOUNTS_DATA_DIR (shared with the other stores; tests use it).

export interface VectorRecord {
  id: string; // embedder id that produced this vector
  vector: number[];
}

type EmbeddingMap = Record<string, VectorRecord>;

function embeddingsFile(): string {
  const base = process.env.ACCOUNTS_DATA_DIR ?? join(process.cwd(), 'data');
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return join(base, 'embeddings.json');
}

const keyOf = (platform: Platform, id: string): string => `${platform}:${id}`;

export function getEmbeddingMap(): EmbeddingMap {
  const file = embeddingsFile();
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as EmbeddingMap;
  } catch {
    return {};
  }
}

function save(map: EmbeddingMap): void {
  writeFileSync(embeddingsFile(), JSON.stringify(map));
}

export function getVector(platform: Platform, id: string): VectorRecord | undefined {
  return getEmbeddingMap()[keyOf(platform, id)];
}

// Upsert one post's vector. `embedderId` records the backend so stale-on-backend-change
// vectors can be detected and ignored by search.
export function setVector(platform: Platform, id: string, embedderId: string, vector: number[]): void {
  const map = getEmbeddingMap();
  map[keyOf(platform, id)] = { id: embedderId, vector };
  save(map);
}

// Batch upsert — one write for many posts. `entries` are [key, record] where key is
// `platform:id`. Used by the enrich/embed pipeline to avoid N file writes.
export function setVectors(entries: Array<[string, VectorRecord]>): void {
  if (entries.length === 0) return;
  const map = getEmbeddingMap();
  for (const [k, rec] of entries) map[k] = rec;
  save(map);
}

// The set of `platform:id` keys that already have a vector for the given embedder —
// so the pipeline can embed only what's missing/stale.
export function embeddedKeys(embedderId: string): Set<string> {
  const out = new Set<string>();
  for (const [k, rec] of Object.entries(getEmbeddingMap())) {
    if (rec.id === embedderId) out.add(k);
  }
  return out;
}
