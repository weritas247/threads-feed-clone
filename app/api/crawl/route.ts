import { fetchFeed } from '@/lib/feeds';
import { enabledAccounts, recordCrawl, getAccounts } from '@/lib/accountStore';
import type { AccountEntry } from '@/lib/accountStore';
import { savePosts } from '@/lib/postStore';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

// POST { username, platform } → crawl one account.
// POST {} → crawl all enabled accounts (across platforms).
// Each crawl runs the right scraper, saves posts, and persists status/count/time.
export async function POST(request: Request): Promise<Response> {
  const { username, platform } = (await request.json().catch(() => ({}))) as {
    username?: string;
    platform?: Platform;
  };
  const targets =
    username && platform ? [{ username, platform }] : enabledAccounts();

  for (const acct of targets) {
    const result = await fetchFeed(acct.platform, acct.username);
    const status = result.ok ? 'ok' : result.reason;
    const count = result.ok ? result.posts.length : 0;
    const avatarUrl = result.ok ? result.posts[0]?.author.avatarUrl : undefined;
    if (result.ok) savePosts(acct.username, acct.platform, result.posts);
    recordCrawl(acct.username, acct.platform, status, count, Date.now(), avatarUrl);
  }

  const list: AccountEntry[] = getAccounts();
  return Response.json(list);
}
