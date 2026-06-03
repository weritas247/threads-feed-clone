import Link from 'next/link';
import { getSavedPosts } from '@/lib/postStore';
import { Feed } from '@/components/Feed';
import { AccountIcon } from '@/components/AccountIcon';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function SavedPostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ platform?: string }>;
}) {
  const { username } = await params;
  const { platform: rawPlatform } = await searchParams;
  const platform: Platform = rawPlatform === 'x' ? 'x' : 'threads';
  const handle = decodeURIComponent(username).trim().replace(/^@+/, '').toLowerCase();
  const posts = getSavedPosts(handle, platform);

  return (
    <>
      <div className="px-4 pt-4">
        <Link href="/manage" className="text-sm text-secondary hover:underline">
          ← Manage
        </Link>
      </div>
      <h2 className="flex items-center gap-2 px-4 pb-1 pt-2 text-xl font-bold text-fg">
        <AccountIcon src={posts[0]?.author.avatarUrl} username={handle} size={32} />
        Saved · @{handle}{' '}
        <span className="rounded bg-elevated px-1.5 py-0.5 text-xs font-normal text-secondary">
          {platform === 'x' ? 'X' : 'Threads'}
        </span>
        <span className="text-secondary">({posts.length})</span>
      </h2>
      {posts.length === 0 ? (
        <p className="px-4 py-16 text-center text-secondary">
          No saved posts yet. Crawl this account from the manage tab.
        </p>
      ) : (
        <Feed posts={posts} />
      )}
    </>
  );
}
