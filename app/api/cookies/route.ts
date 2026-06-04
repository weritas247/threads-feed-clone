import { setCookies, clearCookies, status } from '@/lib/cookieStore';
import type { CookiePlatform } from '@/lib/cookieStore';

export const dynamic = 'force-dynamic';

// Cross-origin so the SNS Cookie Parser extension can POST from its background worker.
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

// GET → session status only (no cookie values are ever returned).
export function GET(): Response {
  return json({ sessions: status() });
}

// POST { platform, cookies } → store the user's session cookies for that platform.
export async function POST(request: Request): Promise<Response> {
  const { platform, cookies } = (await request.json().catch(() => ({}))) as {
    platform?: string;
    cookies?: Record<string, string>;
  };
  if (!platform || !cookies || typeof cookies !== 'object') {
    return json({ error: 'platform and cookies required' }, 400);
  }
  const rec = setCookies(platform, cookies);
  if (!rec) {
    return json({ error: `unknown platform: ${platform}` }, 400);
  }
  return json({ ok: true, platform: rec.platform, count: Object.keys(rec.cookies).length });
}

// DELETE { platform } → forget a stored session.
export async function DELETE(request: Request): Promise<Response> {
  const { platform } = (await request.json().catch(() => ({}))) as { platform?: CookiePlatform };
  if (!platform) return json({ error: 'platform required' }, 400);
  clearCookies(platform);
  return json({ ok: true });
}
