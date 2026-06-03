import { fetchAccountFeed } from '@/lib/threads';
import { enabledUsernames } from '@/lib/accountStore';
import { Feed } from '@/components/Feed';
import type { Post } from '@/lib/types';

export const revalidate = 300; // cache scrapes for 5 minutes

export default async function HomePage() {
  const results = await Promise.allSettled(enabledUsernames().map((u) => fetchAccountFeed(u)));
  const posts: Post[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.ok) posts.push(...r.value.posts);
  }
  posts.sort((a, b) => b.createdAt - a.createdAt);
  return <Feed posts={posts} />;
}
