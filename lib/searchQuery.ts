import type { Post, Platform } from './types';
import type { Enrichment } from './ai/types';
import type { CaptureState } from './captureStateStore';
import { cosine } from './vector';
import { tokenize } from './search';

// Faceted hybrid search over the knowledge base: structured filters (platform / type /
// topic / entity / triage / author / date / tag) narrow the set, then a single ranking
// blends keyword and semantic relevance. All pure — the page supplies the stores as ctx.

export interface SearchFilters {
  platform?: Platform;
  type?: string;
  topic?: string;
  entity?: string;
  state?: CaptureState;
  author?: string; // lowercased username
  after?: number; // unix sec, inclusive
  before?: number; // unix sec, inclusive (end of day)
  tag?: string; // manual tag
  has?: 'media' | 'note' | 'preserved';
}

export type SortMode = 'relevance' | 'recent' | 'engagement';

export interface SearchContext {
  enrichment: Record<string, Enrichment>;
  state: Record<string, CaptureState>;
  tagMap: Record<string, string[]>;
  notes: Record<string, string>;
  vectors: Record<string, { id: string; vector: number[] }>;
  embedderId: string;
  preserved?: Set<string>;
}

const keyOf = (p: Post): string => `${p.platform}:${p.id}`;

const CONTENT_TYPES = new Set(['tutorial', 'news', 'opinion', 'launch', 'thread', 'resource', 'other']);
const STATES = new Set(['inbox', 'kept', 'archived', 'discarded']);

function parseDate(s?: string): number | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const t = Date.parse(s + 'T00:00:00Z');
  return Number.isNaN(t) ? undefined : Math.floor(t / 1000);
}

export function parseFilters(sp: Record<string, string | undefined>): SearchFilters {
  const f: SearchFilters = {};
  if (sp.platform === 'threads' || sp.platform === 'x') f.platform = sp.platform;
  if (sp.type && CONTENT_TYPES.has(sp.type)) f.type = sp.type;
  if (sp.topic) f.topic = sp.topic.toLowerCase();
  if (sp.entity) f.entity = sp.entity;
  if (sp.state && STATES.has(sp.state)) f.state = sp.state as CaptureState;
  if (sp.author) f.author = sp.author.toLowerCase();
  if (sp.tag) f.tag = sp.tag.toLowerCase();
  if (sp.has === 'media' || sp.has === 'note' || sp.has === 'preserved') f.has = sp.has;
  const after = parseDate(sp.after);
  if (after) f.after = after;
  const before = parseDate(sp.before);
  if (before) f.before = before;
  return f;
}

export function activeFilterCount(f: SearchFilters): number {
  return Object.values(f).filter((v) => v !== undefined).length;
}

export function applyFilters(posts: Post[], f: SearchFilters, ctx: SearchContext): Post[] {
  return posts.filter((p) => {
    const k = keyOf(p);
    if (f.platform && p.platform !== f.platform) return false;
    if (f.author && p.author.username.toLowerCase() !== f.author) return false;
    if (f.after && p.createdAt < f.after) return false;
    if (f.before && p.createdAt > f.before + 86399) return false;
    if (f.state && (ctx.state[k] ?? 'inbox') !== f.state) return false;
    if (f.tag && !(ctx.tagMap[k] ?? []).includes(f.tag)) return false;
    if (f.has === 'media' && p.media.length === 0) return false;
    if (f.has === 'note' && !(ctx.notes[k] ?? '').trim()) return false;
    if (f.has === 'preserved' && !ctx.preserved?.has(k)) return false;
    const e = ctx.enrichment[k];
    if (f.type && (!e || e.type !== f.type)) return false;
    if (f.topic && (!e || !e.topics.includes(f.topic))) return false;
    if (f.entity && (!e || !e.entities.some((en) => en.name === f.entity))) return false;
    return true;
  });
}

// Keyword score in [0,1]: fraction of query terms found, body matches weighted over meta.
function keywordScore(p: Post, terms: string[], note: string): number {
  if (terms.length === 0) return 0;
  const text = p.text.toLowerCase();
  const meta = `${p.author.username} ${p.author.displayName} ${note}`.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (text.includes(t)) s += 1;
    else if (meta.includes(t)) s += 0.5;
  }
  return s / terms.length;
}

export interface Ranked {
  post: Post;
  score: number;
  kw: number;
  sem: number;
}

// One ranked list blending exact keyword (0.6) + semantic cosine (0.4) — keyword matches
// lead, semantic adds recall. Posts with no embedding fall back to keyword only.
export function hybridRank(posts: Post[], query: string, queryVec: number[] | null, ctx: SearchContext): Ranked[] {
  const terms = tokenize(query);
  const out: Ranked[] = [];
  for (const p of posts) {
    const k = keyOf(p);
    const kw = keywordScore(p, terms, ctx.notes[k] ?? '');
    let sem = 0;
    if (queryVec) {
      const rec = ctx.vectors[k];
      if (rec && rec.id === ctx.embedderId) sem = Math.max(0, cosine(queryVec, rec.vector));
    }
    const score = kw * 0.6 + sem * 0.4;
    if (score > 0.02) out.push({ post: p, score, kw, sem });
  }
  out.sort((a, b) => b.score - a.score || b.post.createdAt - a.post.createdAt);
  return out;
}

const engagement = (p: Post): number => p.stats.likes + p.stats.replies + p.stats.reposts + p.stats.shares;

export function sortPosts(posts: Post[], mode: SortMode): Post[] {
  const arr = [...posts];
  if (mode === 'engagement') arr.sort((a, b) => engagement(b) - engagement(a));
  else arr.sort((a, b) => b.createdAt - a.createdAt);
  return arr;
}

export interface Facets {
  platforms: Array<{ value: string; count: number }>;
  types: Array<{ value: string; count: number }>;
  topics: Array<{ value: string; count: number }>;
  entities: Array<{ value: string; count: number }>;
  states: Array<{ value: string; count: number }>;
  authors: Array<{ value: string; count: number }>;
}

function top(rec: Record<string, number>, n: number): Array<{ value: string; count: number }> {
  return Object.entries(rec)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, n);
}

// Counts per facet value over the given posts — drives the filter chips' "(n)".
export function computeFacets(posts: Post[], ctx: SearchContext): Facets {
  const platform: Record<string, number> = {};
  const type: Record<string, number> = {};
  const topic: Record<string, number> = {};
  const entity: Record<string, number> = {};
  const state: Record<string, number> = {};
  const author: Record<string, number> = {};
  for (const p of posts) {
    const k = keyOf(p);
    platform[p.platform] = (platform[p.platform] ?? 0) + 1;
    author[p.author.username] = (author[p.author.username] ?? 0) + 1;
    const st = ctx.state[k] ?? 'inbox';
    state[st] = (state[st] ?? 0) + 1;
    const e = ctx.enrichment[k];
    if (e) {
      type[e.type] = (type[e.type] ?? 0) + 1;
      for (const t of e.topics) topic[t] = (topic[t] ?? 0) + 1;
      for (const en of e.entities) entity[en.name] = (entity[en.name] ?? 0) + 1;
    }
  }
  return {
    platforms: top(platform, 5),
    types: top(type, 8),
    topics: top(topic, 12),
    entities: top(entity, 12),
    states: top(state, 4),
    authors: top(author, 10),
  };
}
