import { addTag, removeTag } from '@/lib/accountStore';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

// POST { username, platform, tag, op: 'add' | 'remove' } → returns the full list.
export async function POST(request: Request): Promise<Response> {
  const { username, platform, tag, op } = (await request.json().catch(() => ({}))) as {
    username?: string;
    platform?: Platform;
    tag?: string;
    op?: 'add' | 'remove';
  };
  if (!username || !tag) {
    return new Response('username and tag required', { status: 400 });
  }
  const plat: Platform = platform === 'x' ? 'x' : 'threads';
  const list = op === 'remove' ? removeTag(username, plat, tag) : addTag(username, plat, tag);
  return Response.json(list);
}
