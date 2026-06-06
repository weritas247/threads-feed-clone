export type AiProvider = 'claude' | 'gemini';

// A provider-agnostic feed summarizer. Each backend (Claude, Gemini) implements
// this; the rest of the app only depends on the interface, so adding a provider is
// a new file plus a switch arm — nothing else changes.
export interface Summarizer {
  readonly provider: AiProvider;
  readonly model: string;
  // `system` is the instruction prompt — feed-level or single-post, chosen by the caller.
  summarize(text: string, system: string): Promise<string>;
}

// --- Datafy: structured enrichment derived from a post's text ------------------

export type ContentType =
  | 'tutorial'
  | 'news'
  | 'opinion'
  | 'launch'
  | 'thread'
  | 'resource'
  | 'other';

export type EntityType = 'tool' | 'person' | 'company' | 'concept';

export interface Entity {
  name: string;
  type: EntityType;
}

// The structured data the AI extracts from one post. Stored OUTSIDE the post (like
// tags/notes) keyed by `platform:id`, so it survives re-crawls. `promptVersion`
// lets us detect rows produced by an older prompt and re-enrich only those.
export interface Enrichment {
  summary: string;
  topics: string[];
  entities: Entity[];
  type: ContentType;
  lang: string; // ISO 639-1 best-effort
  keepScore: number; // 0..1 — signal-vs-noise / worth-keeping
  promptVersion: string;
  enrichedAt: number; // unix seconds
  edited?: boolean; // a human corrected topics — pipeline must not overwrite
}

// Result of enriching one post — either the data or a per-item error, so one bad
// post never aborts a whole batch.
export type EnrichOne =
  | { ok: true; value: Omit<Enrichment, 'promptVersion' | 'enrichedAt'> }
  | { ok: false; error: string };

// Provider-agnostic enricher. Batch in, per-item results out (same order/length).
export interface Enricher {
  readonly provider: AiProvider;
  readonly model: string;
  readonly promptVersion: string;
  enrich(texts: string[]): Promise<EnrichOne[]>;
}

// --- Connect/Find: embeddings for semantic search ------------------------------

// Produces L2-normalized vectors so cosine == dot product. `id` distinguishes the
// backend that made a vector (vectors from different backends aren't comparable).
export interface Embedder {
  readonly id: string;
  readonly dim: number;
  embed(texts: string[]): Promise<number[][]>;
}
