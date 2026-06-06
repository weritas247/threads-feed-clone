import type { Embedder } from './types';
import { l2normalize } from '../vector';

// Two embedders behind one interface:
//   • local  — deterministic feature-hashing, no API key, works offline. Crude but
//              real semantic-ish ranking, and keeps the app (and tests) fully working
//              with no provider configured (the "degraded mode").
//   • gemini — Google text-embedding-004 via REST, used when GEMINI_API_KEY is set.
// Vectors from different backends are NOT comparable, so each embedder has an `id`;
// the embedding store records which id produced a vector and search ignores mismatches.

const LOCAL_DIM = 256;

// FNV-1a 32-bit — small, fast, deterministic string hash.
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Word tokens (Latin/number runs) PLUS character bigrams over CJK runs. Korean/Chinese
// text isn't whitespace-segmented, so word tokens alone miss it; char bigrams give the
// local embedder usable signal across languages.
function features(text: string): string[] {
  const lower = (text ?? '').toLowerCase();
  const out: string[] = [];
  const words = lower.match(/[a-z0-9]+/g) ?? [];
  for (const w of words) if (w.length > 1) out.push('w:' + w);
  const cjk = lower.match(/[぀-ヿ㐀-鿿가-힣]+/g) ?? [];
  for (const run of cjk) {
    if (run.length === 1) out.push('c:' + run);
    for (let i = 0; i < run.length - 1; i++) out.push('c:' + run.slice(i, i + 2));
  }
  return out;
}

function hashEmbed(text: string, dim: number): number[] {
  const v = new Array(dim).fill(0);
  for (const f of features(text)) {
    const h = fnv1a(f);
    const idx = h % dim;
    const sign = (h & 0x80000000) === 0 ? 1 : -1; // sign hashing reduces collisions
    v[idx] += sign;
  }
  return l2normalize(v);
}

export function localEmbedder(): Embedder {
  return {
    id: `local-fnv-${LOCAL_DIM}`,
    dim: LOCAL_DIM,
    async embed(texts: string[]): Promise<number[][]> {
      return texts.map((t) => hashEmbed(t, LOCAL_DIM));
    },
  };
}

const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
const GEMINI_EMBED_DIM = 768; // gemini-embedding-001 supports outputDimensionality

interface GeminiBatchResponse {
  embeddings?: { values?: number[] }[];
}

export function geminiEmbedder(): Embedder {
  return {
    id: `gemini-${GEMINI_EMBED_MODEL}-${GEMINI_EMBED_DIM}`,
    dim: GEMINI_EMBED_DIM,
    async embed(texts: string[]): Promise<number[][]> {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error('GEMINI_API_KEY is not set');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:batchEmbedContents?key=${encodeURIComponent(key)}`;
      const requests = texts.map((t) => ({
        model: `models/${GEMINI_EMBED_MODEL}`,
        content: { parts: [{ text: (t ?? '').slice(0, 8000) || ' ' }] },
        outputDimensionality: GEMINI_EMBED_DIM,
      }));
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      });
      if (!res.ok) {
        throw new Error(`Gemini embed ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      const json = (await res.json()) as GeminiBatchResponse;
      return (json.embeddings ?? []).map((e) => l2normalize(e.values ?? []));
    },
  };
}

// Prefer a real embedding API when configured; otherwise fall back to the local one so
// semantic search always works. (Anthropic has no embeddings API, hence Gemini-or-local.)
export function getEmbedder(): Embedder {
  return process.env.GEMINI_API_KEY ? geminiEmbedder() : localEmbedder();
}
