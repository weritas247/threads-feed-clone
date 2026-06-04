import { getAccounts, addAccount } from '@/lib/accountStore';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Cross-origin so the Chrome extension can add accounts straight from threads.com.
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

// POST { usernames: string[], platform? } → add many accounts to the managed list
// at once (deduped by the store). Avatars are left to self-heal on the Manage page,
// so a big Following import stays fast. Returns how many were newly added.
export async function POST(request: Request): Promise<Response> {
  const { usernames, platform } = (await request.json().catch(() => ({}))) as {
    usernames?: unknown;
    platform?: Platform;
  };
  if (!Array.isArray(usernames) || usernames.length === 0) {
    return json({ error: 'usernames[] required' }, 400);
  }
  const plat: Platform = platform === 'x' ? 'x' : 'threads';
  const before = getAccounts().length;
  let list = getAccounts();
  for (const u of usernames) {
    if (typeof u === 'string' && u.trim()) list = addAccount(u, plat);
  }
  return json({ added: list.length - before, total: list.length });
}
