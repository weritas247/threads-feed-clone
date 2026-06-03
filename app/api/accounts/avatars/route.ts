import { accountsMissingAvatar, setAvatar, getAccounts } from '@/lib/accountStore';
import { fetchAvatar } from '@/lib/feeds';

export const dynamic = 'force-dynamic';

// Backfill avatars for every account that is missing one — independent of crawling.
// Resolves them concurrently, persists what succeeds, and returns the full list.
export async function POST(): Promise<Response> {
  const missing = accountsMissingAvatar();
  const resolved = await Promise.all(
    missing.map(async (a) => ({ ...a, url: await fetchAvatar(a.platform, a.username) })),
  );
  for (const { username, platform, url } of resolved) {
    if (url) setAvatar(username, platform, url);
  }
  return Response.json(getAccounts());
}
