import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Platform } from './types';
import type { Enrichment } from './ai/types';

// File-backed structured enrichment, one record per post, keyed by `platform:id` —
// same external-store pattern as tags/notes (postStore overwrites posts on crawl, so
// enrichment must live outside the post). `promptVersion` on each record lets the
// pipeline re-enrich only rows produced by an older prompt. Server-only.
// Dir overridable via ACCOUNTS_DATA_DIR (shared with the other stores; tests use it).

type EnrichmentMap = Record<string, Enrichment>;

function enrichmentFile(): string {
  const base = process.env.ACCOUNTS_DATA_DIR ?? join(process.cwd(), 'data');
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return join(base, 'enrichment.json');
}

const keyOf = (platform: Platform, id: string): string => `${platform}:${id}`;

export function getEnrichmentMap(): EnrichmentMap {
  const file = enrichmentFile();
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as EnrichmentMap;
  } catch {
    return {};
  }
}

function save(map: EnrichmentMap): void {
  writeFileSync(enrichmentFile(), JSON.stringify(map));
}

export function getEnrichment(platform: Platform, id: string): Enrichment | undefined {
  return getEnrichmentMap()[keyOf(platform, id)];
}

export function setEnrichment(platform: Platform, id: string, e: Enrichment): void {
  const map = getEnrichmentMap();
  map[keyOf(platform, id)] = e;
  save(map);
}

// Batch upsert — one write for many posts. `entries` are [`platform:id`, Enrichment].
export function setEnrichments(entries: Array<[string, Enrichment]>): void {
  if (entries.length === 0) return;
  const map = getEnrichmentMap();
  for (const [k, e] of entries) map[k] = e;
  save(map);
}

// Keys the pipeline should NOT re-enrich: already at the current prompt version, OR
// human-edited (manual topic corrections must survive re-runs).
export function freshKeys(promptVersion: string): Set<string> {
  const out = new Set<string>();
  for (const [k, e] of Object.entries(getEnrichmentMap())) {
    if (e.promptVersion === promptVersion || e.edited) out.add(k);
  }
  return out;
}

const normTopic = (t: string): string => t.trim().toLowerCase();

// A minimal record for a post that has no AI enrichment yet but the user is tagging a
// topic onto. Marked edited so the pipeline leaves it alone.
function manualBase(): Enrichment {
  return {
    summary: '',
    topics: [],
    entities: [],
    type: 'other',
    lang: 'und',
    keepScore: 0.5,
    promptVersion: 'manual',
    enrichedAt: Math.floor(Date.now() / 1000),
    edited: true,
  };
}

// Add a topic to a post's enrichment (creating a minimal record if none exists). Marks
// the record edited. Returns the new topic list.
export function addTopic(platform: Platform, id: string, topic: string): string[] {
  const t = normTopic(topic);
  const map = getEnrichmentMap();
  const k = keyOf(platform, id);
  const e = map[k] ?? manualBase();
  if (t && !e.topics.includes(t)) e.topics = [...e.topics, t];
  e.edited = true;
  map[k] = e;
  save(map);
  return e.topics;
}

// Remove a topic from a post's enrichment. Marks the record edited. No-op if absent.
export function removeTopic(platform: Platform, id: string, topic: string): string[] {
  const t = normTopic(topic);
  const map = getEnrichmentMap();
  const k = keyOf(platform, id);
  const e = map[k];
  if (!e) return [];
  e.topics = e.topics.filter((x) => x !== t);
  e.edited = true;
  map[k] = e;
  save(map);
  return e.topics;
}

// Merge topic `from` into `to` across the whole archive: every record carrying `from`
// gets it replaced by `to` (deduped), and is marked edited so the pipeline preserves the
// merge. Returns the number of records changed. Used to fold synonyms ("ai" → "ai agents").
export function mergeTopic(from: string, to: string): number {
  const f = normTopic(from);
  const t = normTopic(to);
  if (!f || !t || f === t) return 0;
  const map = getEnrichmentMap();
  let changed = 0;
  for (const e of Object.values(map)) {
    if (!e.topics.includes(f)) continue;
    e.topics = [...new Set(e.topics.map((x) => (x === f ? t : x)))];
    e.edited = true;
    changed++;
  }
  if (changed) save(map);
  return changed;
}

// key → topics, for threading enrichment topics into feeds (like the tag map).
export function getTopicMap(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [k, e] of Object.entries(getEnrichmentMap())) {
    if (e.topics.length) out[k] = e.topics;
  }
  return out;
}

// Topic → count across all enrichment, for the /topics hub. Sorted by count desc.
export function topicCounts(): Array<{ topic: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const e of Object.values(getEnrichmentMap())) {
    for (const t of e.topics) counts[t] = (counts[t] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
}

// The set of `platform:id` keys whose enrichment carries `topic` — for filtering a feed.
export function keysWithTopic(topic: string): Set<string> {
  const t = topic.trim().toLowerCase();
  const out = new Set<string>();
  if (!t) return out;
  for (const [k, e] of Object.entries(getEnrichmentMap())) {
    if (e.topics.includes(t)) out.add(k);
  }
  return out;
}

// Topics that co-occur with `topic` in the same posts, by shared-post count desc — the
// connection layer for the topic hub ("related topics").
export function relatedTopics(topic: string, limit = 12): Array<{ topic: string; count: number }> {
  const t = topic.trim().toLowerCase();
  const counts: Record<string, number> = {};
  for (const e of Object.values(getEnrichmentMap())) {
    if (!e.topics.includes(t)) continue;
    for (const other of e.topics) {
      if (other !== t) counts[other] = (counts[other] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
    .slice(0, limit);
}

// A topic co-occurrence graph for the /graph view: nodes are the top topics (by post
// count), edges connect topics that appear together, weighted by shared-post count. Only
// edges between included nodes are returned. Pure aggregation over the enrichment map.
export interface TopicGraph {
  nodes: Array<{ id: string; count: number }>;
  edges: Array<{ a: string; b: string; weight: number }>;
}

export function topicGraph(maxNodes = 40, minEdgeWeight = 2): TopicGraph {
  const counts = topicCounts();
  const nodes = counts.slice(0, maxNodes);
  const included = new Set(nodes.map((n) => n.topic));

  // Count co-occurrences for pairs of included topics.
  const pairs = new Map<string, { a: string; b: string; weight: number }>();
  for (const e of Object.values(getEnrichmentMap())) {
    const present = e.topics.filter((t) => included.has(t));
    for (let i = 0; i < present.length; i++) {
      for (let j = i + 1; j < present.length; j++) {
        const [a, b] = present[i] < present[j] ? [present[i], present[j]] : [present[j], present[i]];
        const key = `${a}\t${b}`; // topics never contain a tab
        const cur = pairs.get(key);
        if (cur) cur.weight++;
        else pairs.set(key, { a, b, weight: 1 });
      }
    }
  }
  const edges = [...pairs.values()].filter((e) => e.weight >= minEdgeWeight);
  return { nodes: nodes.map((n) => ({ id: n.topic, count: n.count })), edges };
}

// Entity name → {type, count} across all enrichment, for the /entities hub. A name can
// appear with one type (first seen wins); sorted by count desc.
export function entityCounts(): Array<{ name: string; type: string; count: number }> {
  const map = new Map<string, { type: string; count: number }>();
  for (const e of Object.values(getEnrichmentMap())) {
    for (const ent of e.entities) {
      const cur = map.get(ent.name);
      if (cur) cur.count++;
      else map.set(ent.name, { type: ent.type, count: 1 });
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, type: v.type, count: v.count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// `platform:id` keys whose enrichment mentions an entity by name (case-insensitive).
export function keysWithEntity(name: string): Set<string> {
  const n = name.trim().toLowerCase();
  const out = new Set<string>();
  if (!n) return out;
  for (const [k, e] of Object.entries(getEnrichmentMap())) {
    if (e.entities.some((ent) => ent.name.toLowerCase() === n)) out.add(k);
  }
  return out;
}
