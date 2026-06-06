import { allKnowledgePosts } from '@/lib/pipeline';
import { relatedPosts } from '@/lib/semanticSearch';
import { getEmbedder } from '@/lib/ai';
import type { Platform, Post } from '@/lib/types';

export const dynamic = 'force-dynamic';

const keyOf = (platform: Platform, id: string): string => `${platform}:${id}`;

// POST { platform, id } → posts semantically closest to the given one (excludes itself).
// Uses the target's stored vector, so no embedding call is needed. Empty if the post
// isn't embedded yet (run the enrich pipeline).
export async function POST(request: Request): Promise<Response> {
  const { platform, id } = (await request.json().catch(() => ({}))) as {
    platform?: Platform;
    id?: string;
  };
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });
  const plat: Platform = platform === 'x' ? 'x' : 'threads';

  const posts = allKnowledgePosts();
  const target = posts.find((p) => keyOf(p.platform, p.id) === keyOf(plat, id));
  if (!target) return Response.json({ related: [] });

  const embedder = getEmbedder();
  const hits = relatedPosts(target, posts, embedder.id, 6);
  const related = hits.map((h: { item: Post; score: number }) => ({
    id: h.item.id,
    platform: h.item.platform,
    username: h.item.author.username,
    permalink: h.item.permalink,
    text: h.item.text.slice(0, 200),
    score: Math.round(h.score * 100) / 100,
  }));
  return Response.json({ related });
}
