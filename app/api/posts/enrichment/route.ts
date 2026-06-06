import { addTopic, removeTopic, mergeTopic } from '@/lib/enrichmentStore';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

// POST → edit AI topics by hand. Two shapes:
//   { action: 'add'|'remove', platform, id, topic }  → per-post topic edit (returns topics)
//   { action: 'merge', from, to }                    → fold a synonym archive-wide (returns changed)
// Edits mark the enrichment record so the pipeline won't overwrite them.
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    action?: 'add' | 'remove' | 'merge';
    platform?: Platform;
    id?: string;
    topic?: string;
    from?: string;
    to?: string;
  };

  if (body.action === 'merge') {
    if (!body.from || !body.to) return Response.json({ error: 'from and to required' }, { status: 400 });
    const changed = mergeTopic(body.from, body.to);
    return Response.json({ changed });
  }

  if (!body.id || !body.topic) return Response.json({ error: 'id and topic required' }, { status: 400 });
  const plat: Platform = body.platform === 'x' ? 'x' : 'threads';
  const topics = body.action === 'remove' ? removeTopic(plat, body.id, body.topic) : addTopic(plat, body.id, body.topic);
  return Response.json({ topics });
}
