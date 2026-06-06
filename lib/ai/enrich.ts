import type {
  ContentType,
  EnrichOne,
  Enricher,
  Entity,
  EntityType,
  Summarizer,
} from './types';

// Datafy: turn a raw post into structured data. Two backends behind one interface,
// mirroring embed.ts:
//   • provider (Claude/Gemini) — real extraction, used when a key is configured. We
//     reuse the existing Summarizer.summarize(text, system) with a JSON system prompt,
//     so NO new provider code is needed — adding a provider stays one file.
//   • local — heuristic extraction (hashtags, language, link/length signal). Keeps the
//     pipeline (and tests) fully working with no API key (the "degraded mode").

export const ENRICH_PROMPT_VERSION = 'enrich-v1';
export const LOCAL_ENRICH_VERSION = 'local-v1';

const CONTENT_TYPES: ContentType[] = [
  'tutorial', 'news', 'opinion', 'launch', 'thread', 'resource', 'other',
];
const ENTITY_TYPES: EntityType[] = ['tool', 'person', 'company', 'concept'];

export const ENRICH_SYSTEM = `You extract structured data from ONE social-media post (Threads / X). The input may be a single post or a numbered multi-part self-thread by the same author.

Return ONLY a JSON object (no markdown fence, no prose) with exactly these fields:
{
  "summary": string,        // 1-2 sentences, in the post's own language
  "topics": string[],       // 2-5 short lowercase topic tags, normalized (e.g. "ai agents", "prompt engineering"); no '#'
  "entities": [{"name": string, "type": "tool"|"person"|"company"|"concept"}],  // named tools/people/companies/concepts actually mentioned; [] if none
  "type": "tutorial"|"news"|"opinion"|"launch"|"thread"|"resource"|"other",
  "lang": string,           // ISO 639-1 code of the post, e.g. "en", "ko"
  "keepScore": number       // 0..1: how much durable knowledge value this holds. Pure engagement-bait / "gm" / one-word replies → low; substantive tips, news, resources → high
}

Rules:
- Base everything ONLY on the post; never invent entities or facts not present.
- Keep topics consistent and reusable across posts (prefer canonical names).
- Output the JSON object and nothing else.`;

// --- Parsing the model's JSON, defensively -------------------------------------

function clampScore(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return 0.5;
  return Math.max(0, Math.min(1, x));
}

function asEntity(raw: unknown): Entity | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const name = String(o.name ?? '').trim();
  if (!name) return null;
  const type = ENTITY_TYPES.includes(o.type as EntityType) ? (o.type as EntityType) : 'concept';
  return { name, type };
}

// Parse one enrichment object out of the model's reply. Tolerates code fences and
// leading/trailing prose by extracting the first {...} block. Returns an EnrichOne.
export function parseEnrichment(raw: string): EnrichOne {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    return { ok: false, error: 'no JSON object in model output' };
  }
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch (e) {
    return { ok: false, error: `JSON parse: ${e instanceof Error ? e.message : String(e)}` };
  }
  const topics = Array.isArray(obj.topics)
    ? [...new Set(obj.topics.map((t) => String(t).trim().toLowerCase()).filter(Boolean))]
    : [];
  const entities = Array.isArray(obj.entities)
    ? (obj.entities.map(asEntity).filter(Boolean) as Entity[])
    : [];
  const type = CONTENT_TYPES.includes(obj.type as ContentType) ? (obj.type as ContentType) : 'other';
  return {
    ok: true,
    value: {
      summary: String(obj.summary ?? '').trim(),
      topics,
      entities,
      type,
      lang: String(obj.lang ?? '').trim().slice(0, 5) || 'und',
      keepScore: clampScore(obj.keepScore),
    },
  };
}

// Run an async mapper over items with a bounded concurrency (provider rate-limit
// friendliness + keeps one slow/failed call from blocking the rest).
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Wrap any Summarizer into an Enricher: one JSON call per post, per-item error capture
// so a single bad post never aborts the batch. Each item retries a couple of times with
// backoff (providers rate-limit per-minute, so a modest concurrency + retry drains a
// batch reliably instead of dropping half of it on a transient 429).
export function makeEnricher(summarizer: Summarizer, concurrency = 3, retries = 2): Enricher {
  return {
    provider: summarizer.provider,
    model: summarizer.model,
    promptVersion: ENRICH_PROMPT_VERSION,
    async enrich(texts: string[]): Promise<EnrichOne[]> {
      return mapLimit(texts, concurrency, async (text): Promise<EnrichOne> => {
        let lastErr = '';
        for (let attempt = 0; attempt <= retries; attempt++) {
          if (attempt > 0) await sleep(800 * attempt + 200 * attempt * attempt);
          try {
            const reply = await summarizer.summarize(text || ' ', ENRICH_SYSTEM);
            const parsed = parseEnrichment(reply);
            if (parsed.ok) return parsed;
            lastErr = parsed.error;
          } catch (e) {
            lastErr = e instanceof Error ? e.message : String(e);
          }
        }
        return { ok: false, error: lastErr };
      });
    },
  };
}

// --- Heuristic local enricher (no API key) -------------------------------------

const STOP = new Set([
  'this', 'that', 'with', 'from', 'have', 'your', 'they', 'will', 'about', 'what',
  'when', 'them', 'then', 'than', 'into', 'just', 'like', 'more', 'over', 'also',
  'here', 'there', 'their', 'would', 'could', 'should', 'http', 'https',
]);

function detectLang(text: string): string {
  // Hangul syllables, conjoining jamo, and compatibility jamo (e.g. bare ㅎㅇ).
  if (/[가-힣ᄀ-ᇿ㄰-ㆎ]/.test(text)) return 'ko';
  if (/[぀-ヿ]/.test(text)) return 'ja';
  if (/[一-鿿]/.test(text)) return 'zh';
  return 'en';
}

export function localEnrichOne(text: string): EnrichOne {
  const t = (text ?? '').trim();
  const hashtags = [...t.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1].toLowerCase());
  let topics = [...new Set(hashtags)].slice(0, 5);
  if (topics.length === 0) {
    const freq: Record<string, number> = {};
    for (const w of (t.toLowerCase().match(/[a-z][a-z0-9]{3,}/g) ?? [])) {
      if (!STOP.has(w)) freq[w] = (freq[w] ?? 0) + 1;
    }
    topics = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([w]) => w);
  }
  const hasLink = /https?:\/\//.test(t);
  const len = t.replace(/\s+/g, ' ').length;
  // crude worth-keeping: longer + has a link/hashtag → more keepable; tiny posts → low
  let keepScore = Math.min(1, len / 280) * 0.7;
  if (hasLink) keepScore += 0.2;
  if (hashtags.length) keepScore += 0.1;
  keepScore = Math.max(0, Math.min(1, keepScore));
  const summary = (t.split(/(?<=[.!?。！？\n])\s/)[0] ?? t).slice(0, 200).trim();
  return {
    ok: true,
    value: {
      summary,
      topics,
      entities: [],
      type: hasLink ? 'resource' : 'other',
      lang: detectLang(t),
      keepScore,
    },
  };
}

export function localEnricher(): Enricher {
  return {
    provider: 'claude', // nominal; not actually used
    model: 'local-heuristic',
    promptVersion: LOCAL_ENRICH_VERSION,
    async enrich(texts: string[]): Promise<EnrichOne[]> {
      return texts.map(localEnrichOne);
    },
  };
}
