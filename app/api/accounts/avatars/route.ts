import { accountsMissingAvatar, setAvatar, getAccounts } from '@/lib/accountStore';
import { fetchProfileAvatar } from '@/lib/threads';

export const dynamic = 'force-dynamic';

// Backfill avatars for every account that is missing one — independent of crawling.
// Resolves them concurrently, persists what succeeds, and returns the full list.
export async function POST(): Promise<Response> {
  const missing = accountsMissingAvatar();
  const resolved = await Promise.all(
    missing.map(async (username) => ({ username, url: await fetchProfileAvatar(username) })),
  );
  for (const { username, url } of resolved) {
    if (url) setAvatar(username, url);
  }
  return Response.json(getAccounts());
}
