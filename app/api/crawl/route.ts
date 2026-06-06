import { fetchFeed } from '@/lib/feeds';
import { enabledAccounts, recordCrawl, getAccounts } from '@/lib/accountStore';
import type { AccountEntry } from '@/lib/accountStore';
import { savePosts, getSavedPosts } from '@/lib/postStore';
import { archivePosts } from '@/lib/mediaArchive';
import { reconcilePreservation } from '@/lib/preservedStore';
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
    if (result.ok) {
      // Reconcile preservation BEFORE saving: posts we had but this crawl didn't return are
      // gone-at-source → mark preserved. (Compare against what's stored, pre-merge.)
      const storedIds = getSavedPosts(acct.username, acct.platform).map((p) => p.id);
      reconcilePreservation(acct.platform, storedIds, result.posts.map((p) => p.id));
      // Archive media at crawl time (the only window before CDN URLs expire). Opt-in via
      // ARCHIVE_MEDIA=1; best-effort and guarded, so it never breaks a crawl.
      const posts = await archivePosts(result.posts);
      savePosts(acct.username, acct.platform, posts);
    }
    recordCrawl(acct.username, acct.platform, status, count, Date.now(), avatarUrl);
  }

  const list: AccountEntry[] = getAccounts();
  return Response.json(list);
}
