import { topK, type Scored } from './vector';
import { getEmbeddingMap } from './embeddingStore';
import type { Post } from './types';

// Semantic retrieval over the embedding store. The query vector and the embedder id must
// come from the SAME embedder that produced the stored vectors (vectors from different
// backends aren't comparable) — callers pass the current getEmbedder().id.

const keyOf = (p: Post): string => `${p.platform}:${p.id}`;

// Rank `posts` by cosine similarity of their stored vector to `queryVec`. Posts without
// a vector for `embedderId` are skipped.
export function rankByVector(
  posts: Post[],
  queryVec: number[],
  embedderId: string,
  k = 50,
  minScore = 0.05,
): Scored<Post>[] {
  const map = getEmbeddingMap();
  return topK(
    queryVec,
    posts,
    (p) => {
      const rec = map[keyOf(p)];
      return rec && rec.id === embedderId ? rec.vector : null;
    },
    k,
    minScore,
  );
}

// Posts most similar to `target` (excludes the target itself). Uses the target's own
// stored vector as the query, so no embedding call is needed.
export function relatedPosts(target: Post, posts: Post[], embedderId: string, k = 6): Scored<Post>[] {
  const map = getEmbeddingMap();
  const self = map[keyOf(target)];
  if (!self || self.id !== embedderId) return [];
  const others = posts.filter((p) => keyOf(p) !== keyOf(target));
  return rankByVector(others, self.vector, embedderId, k, 0.1);
}

// Hybrid: exact keyword hits first (highest trust), then semantically-related posts not
// already in the keyword set ("related by meaning") — recall beyond literal matches.
export interface HybridResult {
  exact: Post[];
  related: Scored<Post>[];
}

export function mergeHybrid(
  keywordHits: Post[],
  semantic: Scored<Post>[],
): HybridResult {
  const seen = new Set(keywordHits.map(keyOf));
  const related = semantic.filter((s) => !seen.has(keyOf(s.item)));
  return { exact: keywordHits, related };
}
