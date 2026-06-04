import Anthropic from '@anthropic-ai/sdk';
import type { Summarizer } from './types';

// Latest, most capable Claude model. Adaptive thinking is off for this short,
// well-scoped summarization task (kept fast); the system prompt is marked
// cache_control so repeat summaries reuse it (prefix cache, 5-min TTL).
const MODEL = 'claude-opus-4-8';

export function claudeSummarizer(): Summarizer {
  // Reads ANTHROPIC_API_KEY from the environment.
  const client = new Anthropic();

  return {
    provider: 'claude',
    model: MODEL,
    async summarize(text: string, system: string): Promise<string> {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        thinking: { type: 'disabled' },
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: text }],
      });
      return res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
    },
  };
}
