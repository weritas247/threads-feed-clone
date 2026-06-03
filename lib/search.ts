import type { Post } from './types';

// Split a query into lowercased whitespace-separated terms.
export function tokenize(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function matchesAll(haystack: string, terms: string[]): boolean {
  const hay = haystack.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

// Posts where EVERY term appears in the body, username, or display name.
export function searchPosts(posts: Post[], query: string): Post[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];
  return posts.filter((p) =>
    matchesAll(`${p.text} ${p.author.username} ${p.author.displayName}`, terms),
  );
}

// Whether an account's handle/display name matches every term.
export function accountMatches(username: string, displayName: string, query: string): boolean {
  const terms = tokenize(query);
  if (terms.length === 0) return false;
  return matchesAll(`${username} ${displayName}`, terms);
}
