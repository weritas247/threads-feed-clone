import type { AiProvider, Summarizer } from './types';
import { claudeSummarizer } from './claude';
import { geminiSummarizer } from './gemini';

// Resolve a summarizer for the requested provider, falling back to AI_PROVIDER env
// (default 'claude'). Adding a provider = one new file + one arm here.
export function getSummarizer(provider?: AiProvider): Summarizer {
  const p: AiProvider = provider ?? (process.env.AI_PROVIDER === 'gemini' ? 'gemini' : 'claude');
  return p === 'gemini' ? geminiSummarizer() : claudeSummarizer();
}

// Which providers have an API key configured — used to drive the UI's choices.
export function availableProviders(): AiProvider[] {
  const out: AiProvider[] = [];
  if (process.env.ANTHROPIC_API_KEY) out.push('claude');
  if (process.env.GEMINI_API_KEY) out.push('gemini');
  return out;
}

export type { AiProvider, Summarizer };
