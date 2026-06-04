import { getAllSavedPosts } from '@/lib/postStore';
import { getBookmarks } from '@/lib/bookmarkStore';
import { getSummarizer, availableProviders } from '@/lib/ai';
import type { AiProvider } from '@/lib/ai';
import {
  buildFeedText,
  postsToItems,
  SUMMARY_SYSTEM,
  POST_SUMMARY_SYSTEM,
  type FeedItem,
} from '@/lib/ai/prompt';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAX_POSTS = 40;

// GET → which providers are configured (have an API key), so the UI can show them.
export function GET(): Response {
  return Response.json({ providers: availableProviders() });
}

function sanitize(raw: unknown): FeedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((it) => {
      const o = (it ?? {}) as Record<string, unknown>;
      return {
        username: String(o.username ?? ''),
        platform: o.platform === 'x' ? ('x' as Platform) : ('threads' as Platform),
        text: String(o.text ?? ''),
      };
    })
    .filter((it) => it.text.trim().length > 0);
}

// POST → AI summary. The caller passes the feed's own posts as `items` (so any feed —
// home, per-account, saved, search — can be summarized). If `items` is omitted, falls
// back to the saved store selected by `platform` / `source`.
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    provider?: AiProvider;
    items?: unknown;
    platform?: Platform;
    source?: 'saved' | 'feed';
    mode?: 'feed' | 'post';
  };

  let items = sanitize(body.items);
  if (items.length === 0) {
    let posts = body.source === 'saved' ? getBookmarks() : getAllSavedPosts();
    if (body.platform === 'threads' || body.platform === 'x') {
      posts = posts.filter((p) => p.platform === body.platform);
    }
    items = postsToItems(posts);
  }
  items = items.slice(0, MAX_POSTS);

  if (items.length === 0) {
    return Response.json({ error: 'No posts to summarize yet.' }, { status: 422 });
  }

  // Resolve to a provider that actually has an API key. Honour an explicit, configured
  // choice; otherwise fall back to whatever is configured (so a request with no provider
  // — e.g. the per-post button — doesn't blindly hit an unconfigured Claude/Gemini).
  const available = availableProviders();
  if (available.length === 0) {
    return Response.json(
      { error: 'No AI provider configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.' },
      { status: 503 },
    );
  }
  const provider =
    body.provider && available.includes(body.provider) ? body.provider : available[0];

  try {
    const summarizer = getSummarizer(provider);
    const system = body.mode === 'post' ? POST_SUMMARY_SYSTEM : SUMMARY_SYSTEM;
    const summary = await summarizer.summarize(buildFeedText(items), system);
    if (!summary) {
      return Response.json({ error: 'The model returned an empty summary.' }, { status: 502 });
    }
    return Response.json({
      summary,
      provider: summarizer.provider,
      model: summarizer.model,
      count: items.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
