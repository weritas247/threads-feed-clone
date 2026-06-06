import { allKnowledgePosts, postFullText } from '@/lib/pipeline';
import { rankByVector } from '@/lib/semanticSearch';
import { getEmbedder, getSummarizer, availableProviders } from '@/lib/ai';
import { ASK_SYSTEM, buildSourcesText } from '@/lib/ai/prompt';
import type { AiProvider } from '@/lib/ai';
import type { Post } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TOP_K = 8;

function sourceOf(p: Post, score: number) {
  return {
    username: p.author.username,
    platform: p.platform,
    permalink: p.permalink,
    text: p.text.slice(0, 280),
    score: Math.round(score * 100) / 100,
  };
}

// POST {question, provider?} → retrieve the most relevant posts from the archive by
// semantic similarity, then (if an AI provider is configured) synthesize a cited answer.
// With no provider, returns the retrieved sources only — retrieval still works offline.
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    question?: string;
    provider?: AiProvider;
  };
  const question = (body.question ?? '').trim();
  if (!question) {
    return Response.json({ error: 'Ask a question.' }, { status: 422 });
  }

  const posts = allKnowledgePosts();
  if (posts.length === 0) {
    return Response.json(
      { error: 'Your archive is empty. Crawl or import posts first.' },
      { status: 422 },
    );
  }

  // Embed the question with the same backend that produced the stored vectors.
  const embedder = getEmbedder();
  let queryVec: number[];
  try {
    [queryVec] = await embedder.embed([question]);
  } catch (e) {
    return Response.json(
      { error: `Embedding failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    );
  }

  const hits = rankByVector(posts, queryVec, embedder.id, TOP_K, 0.05);
  const sources = hits.map((h) => sourceOf(h.item, h.score));

  if (hits.length === 0) {
    return Response.json({
      answer: '',
      sources: [],
      note: 'No posts in your archive seem related. Try enriching/embedding more posts.',
    });
  }

  // No AI provider → extractive mode: return the retrieved sources, no synthesis.
  const providers = availableProviders();
  if (providers.length === 0) {
    return Response.json({
      answer: '',
      sources,
      note: 'No AI provider configured — showing the most relevant posts. Set ANTHROPIC_API_KEY or GEMINI_API_KEY for synthesized answers.',
    });
  }

  const provider = body.provider && providers.includes(body.provider) ? body.provider : providers[0];
  try {
    const summarizer = getSummarizer(provider);
    const sourcesText = buildSourcesText(hits.map((h) => ({ ...h.item, text: postFullText(h.item) })));
    const userMsg = `Question: ${question}\n\nSources:\n${sourcesText}`;
    const answer = await summarizer.summarize(userMsg, ASK_SYSTEM);
    return Response.json({ answer, sources, provider: summarizer.provider, model: summarizer.model });
  } catch (e) {
    // Retrieval already succeeded — if synthesis fails (rate limit, etc.), still return the
    // sources so the question isn't a dead end. The user gets the relevant posts to read.
    return Response.json({
      answer: '',
      sources,
      note: `Couldn't synthesize an answer (${e instanceof Error ? e.message : String(e)}). Showing the most relevant posts instead.`,
    });
  }
}
