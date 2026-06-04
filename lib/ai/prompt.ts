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
