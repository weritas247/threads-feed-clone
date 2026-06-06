import type { Post } from './types';
import type { Enrichment } from './ai/types';
import type { CaptureState } from './captureStateStore';

// Knowledge-base health metrics — the north-star surface the roadmap called for. Split
// into a PURE `computeStats` (unit-tested) and a store-backed `knowledgeStats` wrapper.

export interface KnowledgeStats {
  total: number;
  byPlatform: { threads: number; x: number };
  coverage: { enriched: number; embedded: number; enrichedPct: number; embeddedPct: number };
  triage: Record<CaptureState, number>;
  signal: { avgKeepScore: number; highSignal: number; highSignalPct: number };
  byType: Array<{ type: string; count: number }>;
  topics: { distinct: number; top: Array<{ topic: string; count: number }> };
  entities: { distinct: number; top: Array<{ name: string; count: number }> };
  collections: { count: number; synthesized: number };
}

export interface StatsInput {
  posts: Post[];
  enrichment: Record<string, Enrichment>;
  state: Record<string, CaptureState>;
  embeddedKeys: Set<string>;
  collections: Array<{ note: string }>;
  promptVersion: string;
}

const keyOf = (p: Post): string => `${p.platform}:${p.id}`;

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 100);
}

export function computeStats(input: StatsInput): KnowledgeStats {
  const { posts, enrichment, state, embeddedKeys, collections, promptVersion } = input;
  const total = posts.length;

  const byPlatform = { threads: 0, x: 0 };
  const triage: Record<CaptureState, number> = { inbox: 0, kept: 0, archived: 0, discarded: 0 };
  const typeCounts: Record<string, number> = {};
  let enriched = 0;
  let embedded = 0;
  let keepSum = 0;
  let keepN = 0;
  let highSignal = 0;

  for (const p of posts) {
    const k = keyOf(p);
    byPlatform[p.platform]++;
    triage[state[k] ?? 'inbox']++;
    if (embeddedKeys.has(k)) embedded++;
    const e = enrichment[k];
    // "enriched" = has a real (non-stale, non-manual-only) enrichment at current prompt,
    // OR any edited/manual record — i.e. it carries structured data.
    if (e && (e.promptVersion === promptVersion || e.edited)) {
      enriched++;
      typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1;
      keepSum += e.keepScore;
      keepN++;
      if (e.keepScore >= 0.5) highSignal++;
    }
  }

  // Topic / entity distinctness across the enrichment that belongs to these posts.
  const postKeys = new Set(posts.map(keyOf));
  const topicC: Record<string, number> = {};
  const entityC: Record<string, number> = {};
  for (const [k, e] of Object.entries(enrichment)) {
    if (!postKeys.has(k)) continue;
    for (const t of e.topics) topicC[t] = (topicC[t] ?? 0) + 1;
    for (const ent of e.entities) entityC[ent.name] = (entityC[ent.name] ?? 0) + 1;
  }
  const top = (rec: Record<string, number>) =>
    Object.entries(rec)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8);

  return {
    total,
    byPlatform,
    coverage: {
      enriched,
      embedded,
      enrichedPct: pct(enriched, total),
      embeddedPct: pct(embedded, total),
    },
    triage,
    signal: {
      avgKeepScore: keepN ? Math.round((keepSum / keepN) * 100) / 100 : 0,
      highSignal,
      highSignalPct: pct(highSignal, keepN),
    },
    byType: Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    topics: {
      distinct: Object.keys(topicC).length,
      top: top(topicC).map(([topic, count]) => ({ topic, count })),
    },
    entities: {
      distinct: Object.keys(entityC).length,
      top: top(entityC).map(([name, count]) => ({ name, count })),
    },
    collections: {
      count: collections.length,
      synthesized: collections.filter((c) => c.note.trim().length > 0).length,
    },
  };
}
