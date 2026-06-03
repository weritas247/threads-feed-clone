import { getAccounts, addAccount, removeAccount, setEnabled, setAvatar } from '@/lib/accountStore';
import { fetchProfileAvatar, normalizeUsername } from '@/lib/threads';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return Response.json(getAccounts());
}

export async function POST(request: Request): Promise<Response> {
  const { username } = (await request.json().catch(() => ({}))) as { username?: string };
  if (!username || !username.trim()) {
    return new Response('username required', { status: 400 });
  }
  addAccount(username);
  // Resolve the new account's avatar immediately so it shows without a crawl.
  const avatar = await fetchProfileAvatar(username);
  const list = avatar ? setAvatar(normalizeUsername(username).toLowerCase(), avatar) : getAccounts();
  return Response.json(list);
}

export async function PATCH(request: Request): Promise<Response> {
  const { username, enabled } = (await request.json().catch(() => ({}))) as {
    username?: string;
    enabled?: boolean;
  };
  if (!username || typeof enabled !== 'boolean') {
    return new Response('username and enabled required', { status: 400 });
  }
  return Response.json(setEnabled(username, enabled));
}

export async function DELETE(request: Request): Promise<Response> {
  const { username } = (await request.json().catch(() => ({}))) as { username?: string };
  if (!username) {
    return new Response('username required', { status: 400 });
  }
  return Response.json(removeAccount(username));
}
