import type { Post } from '@/lib/types';
import { PostCard } from './PostCard';

export function Feed({ posts, highlight }: { posts: Post[]; highlight?: string[] }) {
  if (posts.length === 0) {
    return <p className="px-4 py-16 text-center text-secondary">No posts to show.</p>;
  }
  return (
    <div>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} highlight={highlight} />
      ))}
    </div>
  );
}
