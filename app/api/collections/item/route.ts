import { addToCollection, removeFromCollection, collectionsForPost } from '@/lib/collectionStore';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

// POST → add or remove one post in a collection.
//   { action: 'add'|'remove', id, platform, postId }   // postId for add; key derived
//   { action: 'remove', id, key }                       // or remove by full key
// Returns the collections this post now belongs to, so the card can update its state.
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    action?: 'add' | 'remove';
    id?: string;
    platform?: Platform;
    postId?: string;
    key?: string;
  };
  if (!body.id) return Response.json({ error: 'collection id required' }, { status: 400 });
  const plat: Platform = body.platform === 'x' ? 'x' : 'threads';

  if (body.action === 'add') {
    if (!body.postId) return Response.json({ error: 'postId required' }, { status: 400 });
    addToCollection(body.id, plat, body.postId);
    return Response.json({ collections: collectionsForPost(plat, body.postId) });
  }
  if (body.action === 'remove') {
    const key = body.key ?? (body.postId ? `${plat}:${body.postId}` : '');
    if (!key) return Response.json({ error: 'key or postId required' }, { status: 400 });
    removeFromCollection(body.id, key);
    const [, postId] = key.split(':');
    return Response.json({ collections: collectionsForPost(plat, postId) });
  }
  return Response.json({ error: 'unknown action' }, { status: 400 });
}
