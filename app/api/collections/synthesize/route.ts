import { getCollection, setCollectionNote } from '@/lib/collectionStore';
import { resolveByKeys, postFullText } from '@/lib/pipeline';
import { getSummarizer, availableProviders } from '@/lib/ai';
import { SYNTHESIS_SYSTEM, buildFeedText } from '@/lib/ai/prompt';
import type { AiProvider } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const MAX_POSTS = 40;

// POST { id, provider? } → synthesize the collection's posts into one Markdown note via
// AI, SAVE it on the collection (so it persists), and return it. Requires a provider.
export async function POST(request: Request): Promise<Response> {
  const { id, provider } = (await request.json().catch(() => ({}))) as {
    id?: string;
    provider?: AiProvider;
  };
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });
  const collection = getCollection(id);
  if (!collection) return Response.json({ error: 'collection not found' }, { status: 404 });

  const posts = resolveByKeys(collection.postKeys).slice(0, MAX_POSTS);
  if (posts.length === 0) {
    return Response.json({ error: 'Collection is empty.' }, { status: 422 });
  }

  const available = availableProviders();
  if (available.length === 0) {
    return Response.json(
      { error: 'No AI provider configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.' },
      { status: 503 },
    );
  }
  const p = provider && available.includes(provider) ? provider : available[0];

  try {
    const summarizer = getSummarizer(p);
    const items = posts.map((post) => ({
      username: post.author.username,
      platform: post.platform,
      text: postFullText(post),
    }));
    const note = await summarizer.summarize(buildFeedText(items), SYNTHESIS_SYSTEM);
    if (!note) return Response.json({ error: 'Empty synthesis.' }, { status: 502 });
    setCollectionNote(id, note);
    return Response.json({ note, provider: summarizer.provider, model: summarizer.model });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
