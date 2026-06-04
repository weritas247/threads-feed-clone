import type { Summarizer } from './types';

// Google Gemini via the public Generative Language REST endpoint — no SDK needed.
// Model overridable via GEMINI_MODEL; defaults to the fast Flash tier.
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export function geminiSummarizer(): Summarizer {
  return {
    provider: 'gemini',
    model: MODEL,
    async summarize(text: string, system: string): Promise<string> {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error('GEMINI_API_KEY is not set');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text }] }],
          // Gemini 2.5 "thinking" draws from the output budget; disable it so the
          // full budget goes to the visible summary (and it stays fast).
          generationConfig: {
            maxOutputTokens: 1536,
            temperature: 0.4,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });
      if (!res.ok) {
        throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      const json = (await res.json()) as GeminiResponse;
      return (json.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? '')
        .join('')
        .trim();
    },
  };
}
