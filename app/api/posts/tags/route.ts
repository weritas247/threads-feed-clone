import { addPostTag, removePostTag } from '@/lib/postTagStore';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

// POST { platform, id, tag, op } → add/remove a tag on one post; returns its new tags.
export async function POST(request: Request): Promise<Response> {
  const { platform, id, tag, op } = (await request.json().catch(() => ({}))) as {
    platform?: Platform;
    id?: string;
    tag?: string;
    op?: 'add' | 'remove';
  };
  if (!id || !tag) {
    return Response.json({ error: 'id and tag required' }, { status: 400 });
  }
  const plat: Platform = platform === 'x' ? 'x' : 'threads';
  const tags = op === 'remove' ? removePostTag(plat, id, tag) : addPostTag(plat, id, tag);
  return Response.json({ tags });
}
