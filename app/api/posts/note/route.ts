import { setNote } from '@/lib/postNoteStore';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

// POST { platform, id, note } → save (or clear, if blank) a post's memo; returns it.
export async function POST(request: Request): Promise<Response> {
  const { platform, id, note } = (await request.json().catch(() => ({}))) as {
    platform?: Platform;
    id?: string;
    note?: string;
  };
  if (!id) {
    return Response.json({ error: 'id required' }, { status: 400 });
  }
  const saved = setNote(platform === 'x' ? 'x' : 'threads', id, note ?? '');
  return Response.json({ note: saved });
}
