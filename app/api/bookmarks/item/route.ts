import { addBookmark, removeBookmark } from '@/lib/bookmarkStore';
import type { Platform, Post } from '@/lib/types';

export const dynamic = 'force-dynamic';

// POST a full Post → save it to the bookmark store (the in-feed save button).
export async function POST(request: Request): Promise<Response> {
  const post = (await request.json().catch(() => null)) as Post | null;
  if (!post || !post.id) {
    return Response.json({ error: 'post required' }, { status: 400 });
  }
  const total = addBookmark(post);
  return Response.json({ saved: true, total });
}

// DELETE { platform, id } → unsave one post.
export async function DELETE(request: Request): Promise<Response> {
  const { platform, id } = (await request.json().catch(() => ({}))) as {
    platform?: Platform;
    id?: string;
  };
  if (!id) {
    return Response.json({ error: 'id required' }, { status: 400 });
  }
  const total = removeBookmark(platform === 'x' ? 'x' : 'threads', id);
  return Response.json({ saved: false, total });
}
