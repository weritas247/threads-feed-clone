// Pure vector math for semantic search — no I/O, no deps. Embeddings are L2-normalized
// on creation (see ai/embed.ts), so cosine similarity reduces to a dot product; we still
// guard with norms in case an un-normalized vector slips in.

export function dot(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

export function norm(a: number[]): number {
  return Math.sqrt(dot(a, a));
}

// Cosine similarity in [-1, 1]. Returns 0 for a zero vector or length mismatch edge.
export function cosine(a: number[], b: number[]): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

export function l2normalize(a: number[]): number[] {
  const n = norm(a);
  if (n === 0) return a.slice();
  return a.map((x) => x / n);
}

export interface Scored<T> {
  item: T;
  score: number;
}

// Rank `items` by cosine similarity of `vecOf(item)` to `query`, keep the top `k`
// above `minScore`, highest first. Items with no vector (vecOf → null) are skipped.
export function topK<T>(
  query: number[],
  items: T[],
  vecOf: (item: T) => number[] | null | undefined,
  k: number,
  minScore = 0,
): Scored<T>[] {
  const scored: Scored<T>[] = [];
  for (const item of items) {
    const v = vecOf(item);
    if (!v || v.length === 0) continue;
    const score = cosine(query, v);
    if (score > minScore) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
