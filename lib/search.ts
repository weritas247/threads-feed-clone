import type { Post } from './types';

// Split a query into lowercased whitespace-separated terms.
export function tokenize(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function matchesAll(haystack: string, terms: string[]): boolean {
  const hay = haystack.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

// Posts where EVERY term appears in the body, username, display name, or the post's
// own memo (notes keyed by `platform:id`). Notes are optional — pass them to make memos
// searchable.
export function searchPosts(posts: Post[], query: string, notes: Record<string, string> = {}): Post[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];
  return posts.filter((p) => {
    const note = notes[`${p.platform}:${p.id}`] ?? '';
    return matchesAll(`${p.text} ${p.author.username} ${p.author.displayName} ${note}`, terms);
  });
}

// Whether an account's handle/display name matches every term.
export function accountMatches(username: string, displayName: string, query: string): boolean {
  const terms = tokenize(query);
  if (terms.length === 0) return false;
  return matchesAll(`${username} ${displayName}`, terms);
}
