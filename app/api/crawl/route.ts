import { fetchAccountFeed } from '@/lib/threads';
import { enabledUsernames, recordCrawl, getAccounts } from '@/lib/accountStore';
import type { AccountEntry } from '@/lib/accountStore';

export const dynamic = 'force-dynamic';

// POST { username } → crawl one account.
// POST {} (or no body) → crawl all enabled accounts.
// Each crawl runs the scraper and persists status/count/timestamp, then returns
// the full updated account list.
export async function POST(request: Request): Promise<Response> {
  const { username } = (await request.json().catch(() => ({}))) as { username?: string };
  const targets = username ? [username] : enabledUsernames();

  for (const handle of targets) {
    const result = await fetchAccountFeed(handle);
    const status = result.ok ? 'ok' : result.reason;
    const count = result.ok ? result.posts.length : 0;
    recordCrawl(handle, status, count, Date.now());
  }

  const list: AccountEntry[] = getAccounts();
  return Response.json(list);
}
