import type { Post } from './types';
import type { Enrichment } from './ai/types';
import { getAllSavedPosts } from './postStore';
import { getBookmarks } from './bookmarkStore';
import { getEnricher, getEmbedder } from './ai';
import type { AiProvider } from './ai';
import { freshKeys, setEnrichments } from './enrichmentStore';
import { embeddedKeys, setVectors, type VectorRecord } from './embeddingStore';

// The datafy pipeline: decoupled from crawl on purpose (crawl stays a fast, sync save;
// this runs after, here or from /api/enrich). It enriches + embeds only what's missing
// or stale, in bounded batches, so re-runs are cheap and a partial run is safe.

const keyOf = (p: Post): string => `${p.platform}:${p.id}`;

// Full text for a post including its self-thread chain — so a multi-part thread is
// enriched/embedded as one coherent unit (not just its first part).
export function postFullText(p: Post): string {
  const parts = [p.text, ...(p.chain ?? []).map((c) => c.text)].filter(Boolean);
  return parts.join('\n').trim();
}

// Every post across crawled feeds AND bookmarks, deduped by platform:id (so the
// bookmarks corpus is NOT silently excluded from datafy — a gap the review flagged).
export function allKnowledgePosts(): Post[] {
  const byKey = new Map<string, Post>();
  for (const p of getAllSavedPosts()) byKey.set(keyOf(p), p);
  for (const p of getBookmarks()) if (!byKey.has(keyOf(p))) byKey.set(keyOf(p), p);
  return [...byKey.values()];
}

// Resolve `platform:id` keys to posts, preserving the given key order (drops misses).
export function resolveByKeys(keys: string[]): Post[] {
  const byKey = new Map<string, Post>();
  for (const p of allKnowledgePosts()) byKey.set(keyOf(p), p);
  return keys.map((k) => byKey.get(k)).filter((p): p is Post => Boolean(p));
}

export interface PipelineStatus {
  total: number;
  enriched: number;
  embedded: number;
  pendingEnrich: number;
  pendingEmbed: number;
  enricher: { provider: string; model: string; promptVersion: string };
  embedder: { id: string; dim: number };
}

export function pipelineStatus(provider?: AiProvider): PipelineStatus {
  const posts = allKnowledgePosts();
  const enricher = getEnricher(provider);
  const embedder = getEmbedder();
  const fresh = freshKeys(enricher.promptVersion);
  const embedded = embeddedKeys(embedder.id);
  const keys = posts.map(keyOf);
  return {
    total: posts.length,
    enriched: keys.filter((k) => fresh.has(k)).length,
    embedded: keys.filter((k) => embedded.has(k)).length,
    pendingEnrich: keys.filter((k) => !fresh.has(k)).length,
    pendingEmbed: keys.filter((k) => !embedded.has(k)).length,
    enricher: { provider: enricher.provider, model: enricher.model, promptVersion: enricher.promptVersion },
    embedder: { id: embedder.id, dim: embedder.dim },
  };
}

export interface RunResult {
  enriched: number;
  enrichFailed: number;
  embedded: number;
  remaining: number;
}

// Process up to `limit` posts that need enrichment and/or embedding. Returns how many
// were done and how many still remain, so a caller can loop until drained.
export async function runPipeline(limit = 50, provider?: AiProvider): Promise<RunResult> {
  const posts = allKnowledgePosts();
  const enricher = getEnricher(provider);
  const embedder = getEmbedder();
  const fresh = freshKeys(enricher.promptVersion);
  const embedded = embeddedKeys(embedder.id);

  const needEnrich = posts.filter((p) => !fresh.has(keyOf(p))).slice(0, limit);
  const needEmbed = posts.filter((p) => !embedded.has(keyOf(p))).slice(0, limit);

  let enriched = 0;
  let enrichFailed = 0;
  if (needEnrich.length) {
    const now = Math.floor(Date.now() / 1000);
    const results = await enricher.enrich(needEnrich.map(postFullText));
    const entries: Array<[string, Enrichment]> = [];
    results.forEach((r, i) => {
      if (r.ok) {
        entries.push([
          keyOf(needEnrich[i]),
          { ...r.value, promptVersion: enricher.promptVersion, enrichedAt: now },
        ]);
        enriched++;
      } else {
        enrichFailed++;
      }
    });
    setEnrichments(entries);
  }

  let embeddedCount = 0;
  if (needEmbed.length) {
    const vectors = await embedder.embed(needEmbed.map(postFullText));
    const entries: Array<[string, VectorRecord]> = needEmbed.map((p, i) => [
      keyOf(p),
      { id: embedder.id, vector: vectors[i] ?? [] },
    ]);
    setVectors(entries.filter(([, r]) => r.vector.length > 0));
    embeddedCount = entries.filter(([, r]) => r.vector.length > 0).length;
  }

  const status = pipelineStatus(provider);
  return {
    enriched,
    enrichFailed,
    embedded: embeddedCount,
    remaining: Math.max(status.pendingEnrich, status.pendingEmbed),
  };
}
