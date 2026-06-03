import Link from 'next/link';
import { getSavedPosts } from '@/lib/postStore';
import { normalizeUsername } from '@/lib/threads';
import { Feed } from '@/components/Feed';
import { AccountIcon } from '@/components/AccountIcon';

export const dynamic = 'force-dynamic';

export default async function SavedPostsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const handle = normalizeUsername(decodeURIComponent(username)).toLowerCase();
  const posts = getSavedPosts(handle);

  return (
    <>
      <div className="px-4 pt-4">
        <Link href="/manage" className="text-sm text-secondary hover:underline">
          ← Manage
        </Link>
      </div>
      <h2 className="flex items-center gap-2 px-4 pb-1 pt-2 text-xl font-bold text-fg">
        <AccountIcon src={posts[0]?.author.avatarUrl} username={handle} size={32} />
        Saved · @{handle} <span className="text-secondary">({posts.length})</span>
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
