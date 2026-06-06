import { NextResponse, type NextRequest } from 'next/server';
import { allKnowledgePosts } from '@/lib/pipeline';
import { keysWithTopic, keysWithEntity } from '@/lib/enrichmentStore';

export const dynamic = 'force-dynamic';

// Posts behind a single graph node (a topic or an entity) — fed to the node popup so a
// click previews the relevant feed without leaving the graph. Mirrors how /topics and
// /entities resolve their post lists. Returns a trimmed shape (no need for full media).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind') === 'entity' ? 'entity' : 'topic';
  const id = (searchParams.get('id') ?? '').trim();
  if (!id) return NextResponse.json({ posts: [], count: 0 });

  const keys = kind === 'entity' ? keysWithEntity(id) : keysWithTopic(id);
  const posts = allKnowledgePosts()
    .filter((p) => keys.has(`${p.platform}:${p.id}`))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((p) => ({
      id: p.id,
      platform: p.platform,
      permalink: p.permalink,
      text: p.text,
      createdAt: p.createdAt,
      author: {
        username: p.author.username,
        displayName: p.author.displayName,
        avatarUrl: p.author.avatarUrl,
        verified: p.author.verified,
      },
      stats: p.stats,
      mediaCount: p.media.length,
    }));

  return NextResponse.json({ posts, count: posts.length });
}
