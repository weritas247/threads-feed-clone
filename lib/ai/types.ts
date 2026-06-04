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
