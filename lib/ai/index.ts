import type { AiProvider, Embedder, Enricher, Summarizer } from './types';
import { claudeSummarizer } from './claude';
import { geminiSummarizer } from './gemini';
import { makeEnricher, localEnricher } from './enrich';
import { getEmbedder } from './embed';

// Resolve a summarizer for the requested provider, falling back to AI_PROVIDER env
// (default 'claude'). Adding a provider = one new file + one arm here.
export function getSummarizer(provider?: AiProvider): Summarizer {
  const p: AiProvider = provider ?? (process.env.AI_PROVIDER === 'gemini' ? 'gemini' : 'claude');
  return p === 'gemini' ? geminiSummarizer() : claudeSummarizer();
}

// Resolve an enricher. With a configured provider, wrap its summarizer (real extraction);
// with no key at all, fall back to the heuristic local enricher so the datafy pipeline
// still runs offline.
export function getEnricher(provider?: AiProvider): Enricher {
  const available = availableProviders();
  if (available.length === 0) return localEnricher();
  const p = provider && available.includes(provider) ? provider : available[0];
  return makeEnricher(getSummarizer(p));
}

export { getEmbedder };
export type { Embedder, Enricher };

// Which providers have an API key configured — used to drive the UI's choices.
export function availableProviders(): AiProvider[] {
  const out: AiProvider[] = [];
  if (process.env.ANTHROPIC_API_KEY) out.push('claude');
  if (process.env.GEMINI_API_KEY) out.push('gemini');
  return out;
}

export type { AiProvider, Summarizer };
