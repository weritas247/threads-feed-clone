import { allKnowledgePosts, postFullText } from '@/lib/pipeline';
import { postsInWindow } from '@/lib/digest';
import { getSummarizer, availableProviders } from '@/lib/ai';
import { DIGEST_SYSTEM, buildFeedText } from '@/lib/ai/prompt';
import type { AiProvider } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const MAX_POSTS = 50;

// POST { days?, provider? } → an AI "week in review" of posts captured in the last `days`
// (default 7). Graceful: no provider → 503 with a clear message (the page still shows the
// non-AI stats + posts it gathered itself).
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { days?: number; provider?: AiProvider };
  const days = Math.max(1, Math.min(60, body.days ?? 7));

  const now = Math.floor(Date.now() / 1000);
  const window = postsInWindow(allKnowledgePosts(), now, days);
  if (window.length === 0) {
    return Response.json({ error: `No posts captured in the last ${days} days.` }, { status: 422 });
  }

  const available = availableProviders();
  if (available.length === 0) {
    return Response.json(
      { error: 'No AI provider configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.' },
      { status: 503 },
    );
  }
  const provider = body.provider && available.includes(body.provider) ? body.provider : available[0];

  try {
    const summarizer = getSummarizer(provider);
    const items = window.slice(0, MAX_POSTS).map((p) => ({
      username: p.author.username,
      platform: p.platform,
      text: postFullText(p),
    }));
    const digest = await summarizer.summarize(buildFeedText(items), DIGEST_SYSTEM);
    if (!digest) return Response.json({ error: 'Empty digest.' }, { status: 502 });
    return Response.json({ digest, provider: summarizer.provider, model: summarizer.model, count: window.length });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
