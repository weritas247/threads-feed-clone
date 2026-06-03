import type { Post } from './types';

// Case-insensitive search over post body and author name/handle.
export function searchPosts(posts: Post[], query: string): Post[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return posts.filter(
    (p) =>
      p.text.toLowerCase().includes(q) ||
      p.author.username.toLowerCase().includes(q) ||
      p.author.displayName.toLowerCase().includes(q),
  );
}
