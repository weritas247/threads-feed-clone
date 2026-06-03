import { getAccounts, addAccount, removeAccount, setEnabled, setAvatar } from '@/lib/accountStore';
import { fetchAvatar } from '@/lib/feeds';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

function platformOf(p: unknown): Platform {
  return p === 'x' ? 'x' : 'threads';
}

export async function GET(): Promise<Response> {
  return Response.json(getAccounts());
}

export async function POST(request: Request): Promise<Response> {
  const { username, platform } = (await request.json().catch(() => ({}))) as {
    username?: string;
    platform?: Platform;
  };
  if (!username || !username.trim()) {
    return new Response('username required', { status: 400 });
  }
  const plat = platformOf(platform);
  addAccount(username, plat);
  // Resolve the new account's avatar immediately so it shows without a crawl.
  const avatar = await fetchAvatar(plat, username);
  const list = avatar
    ? setAvatar(username, plat, avatar)
    : getAccounts();
  return Response.json(list);
}

export async function PATCH(request: Request): Promise<Response> {
  const { username, platform, enabled } = (await request.json().catch(() => ({}))) as {
    username?: string;
    platform?: Platform;
    enabled?: boolean;
  };
  if (!username || typeof enabled !== 'boolean') {
    return new Response('username and enabled required', { status: 400 });
  }
  return Response.json(setEnabled(username, platformOf(platform), enabled));
}

export async function DELETE(request: Request): Promise<Response> {
  const { username, platform } = (await request.json().catch(() => ({}))) as {
    username?: string;
    platform?: Platform;
  };
  if (!username) {
    return new Response('username required', { status: 400 });
  }
  return Response.json(removeAccount(username, platformOf(platform)));
}
