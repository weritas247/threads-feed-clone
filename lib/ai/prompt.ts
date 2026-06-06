import type { Platform, Post } from '../types';

// Shared, frozen instruction for both providers — kept stable so Claude can cache it.
// Output-only (no preamble) so we can render the result directly.
export const SUMMARY_SYSTEM = `You summarize a social-media feed (Threads / X posts) for a reader who hasn't read it yet.

Given a numbered list of posts, produce:
- A one-line **TL;DR** of what the feed is about right now.
- 3–6 bullet points grouping the main topics/themes, each naming the notable account(s) when relevant.
- If several posts share a trend or announcement, call it out.

Rules:
- Write in the dominant language of the posts (if they are mostly Korean, answer in Korean).
- Be concise and concrete; do not invent facts not present in the posts.
- Output ONLY the summary itself — no preamble, no "Here is", no meta-commentary, no restating these instructions.`;

// System prompt for summarizing a SINGLE post (optionally a multi-part self-thread).
export const POST_SUMMARY_SYSTEM = `You summarize ONE social-media post for a reader skimming a feed. The input may be a single post or a numbered multi-part thread by the same author.

Produce 1–3 short sentences capturing the key point(s). If it's a thread, summarize the whole thread, not just the first part.

Rules:
- Write in the post's language (if it is mostly Korean, answer in Korean).
- Be concrete; do not invent facts not present in the post.
- Output ONLY the summary — no preamble, no "This post…", no bullet points, no restating these instructions.`;

// System prompt for the "week in review" digest of recently captured posts.
export const DIGEST_SYSTEM = `You write a brief "week in review" for someone's personal feed archive — the posts they captured recently.

Produce, in Markdown:
- A one-line **headline** of the week's dominant themes.
- 3–6 bullets grouping what's notable (topics, launches, debates), naming standout accounts.
- A closing line on any emerging trend worth watching.

Rules:
- Write in the dominant language of the posts (mostly Korean → answer in Korean).
- Synthesize across posts; don't list them one by one or invent facts.
- Output ONLY the digest in Markdown — no preamble, no restating these instructions.`;

// System prompt for synthesizing a collection of posts into one coherent note.
export const SYNTHESIS_SYSTEM = `You turn a curated set of social-media posts (the user's collection) into ONE coherent reference note.

Produce, in Markdown:
- A short **overview** (1-2 sentences) of what this collection is about.
- **Key points / themes** as grouped bullets, synthesizing across posts (merge duplicates, draw connections) — not a post-by-post list.
- Where useful, a short **takeaways** or **resources** section.

Rules:
- Write in the dominant language of the posts (mostly Korean → answer in Korean).
- Synthesize and connect; do not invent facts not present in the posts.
- Output ONLY the note in Markdown — no preamble, no restating these instructions.`;

// System prompt for Ask-my-archive (RAG): answer a question using ONLY the user's own
// retrieved posts, with inline [n] citations back to the numbered sources.
export const ASK_SYSTEM = `You answer the user's question using ONLY the numbered source posts provided (retrieved from their personal Threads/X archive).

Rules:
- Ground every claim in the sources and cite them inline as [1], [2], etc. (matching the source numbers).
- If the sources don't contain the answer, say so plainly — do NOT use outside knowledge or invent facts.
- Write in the question's language (Korean question → Korean answer).
- Be concise: a direct answer first, then supporting detail. No preamble, no restating the question or these instructions.`;

// Render retrieved posts as numbered sources for the RAG prompt. Includes author so the
// model can attribute, and clips each to stay token-frugal.
export function buildSourcesText(posts: Pick<Post, 'author' | 'platform' | 'text'>[]): string {
  return posts
    .map((p, i) => `[${i + 1}] @${p.author.username} (${p.platform}): ${clip(p.text, 500)}`)
    .join('\n');
}

// The minimal shape a feed needs to be summarized — works for any feed (home,
// per-account, saved, search), whether the posts come from the store or a live scrape.
export interface FeedItem {
  username: string;
  platform: Platform;
  text: string;
}

export function postsToItems(posts: Post[]): FeedItem[] {
  return posts.map((p) => ({ username: p.author.username, platform: p.platform, text: p.text }));
}

function clip(text: string, max = 280): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

// Compact, token-frugal rendering of the feed for the model: one line per post,
// author + platform + clipped text. Empty-text posts are skipped.
export function buildFeedText(items: FeedItem[]): string {
  const lines: string[] = [];
  let i = 1;
  for (const it of items) {
    const body = clip(it.text);
    if (!body) continue;
    lines.push(`${i}. @${it.username} (${it.platform}): ${body}`);
    i++;
  }
  return lines.join('\n');
}
