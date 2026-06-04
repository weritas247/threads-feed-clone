import { collectPostsFromData } from '@/lib/parse';
import { collectXPostsFromData } from '@/lib/x';
import { addBookmarks, clearBookmarks } from '@/lib/bookmarkStore';

export const dynamic = 'force-dynamic';

// Allow the Chrome extension (and the bookmarklet's page origin) to POST here from
// any origin; this endpoint only writes to the local bookmark store.
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

// POST → import bookmarked posts captured by the Saved bookmarklet/extension. The
// body is the capture payload (any shape); we walk it for both Threads and X post
// data (the two schemas don't overlap), normalize, and merge into the bookmark
// store. Returns import counts.
export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  if (body == null) {
    return json({ error: 'invalid JSON' }, 400);
  }
  const posts = [...collectPostsFromData(body), ...collectXPostsFromData(body)];
  if (posts.length === 0) {
    return json({ error: 'no Threads posts found in payload', found: 0, added: 0 }, 422);
  }
  const { added, total } = addBookmarks(posts);
  return json({ found: posts.length, added, total });
}

// DELETE → clear all imported bookmarks.
export async function DELETE(): Promise<Response> {
  clearBookmarks();
  return json({ added: 0, total: 0 });
}
