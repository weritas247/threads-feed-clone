import { describe, it, expect } from 'vitest';
import { searchPosts, tokenize, accountMatches } from './search';
import type { Post } from './types';

const mk = (id: string, text: string, username = 'acct', displayName = 'Account'): Post => ({
  id,
  code: id,
  platform: 'threads',
  permalink: `https://www.threads.com/@${username}/post/${id}`,
  author: { username, displayName, avatarUrl: 'https://x/a.jpg', verified: false },
  text,
  createdAt: Number(id),
  media: [],
  stats: { likes: 0, replies: 0, reposts: 0, shares: 0 },
  chain: [],
});

const posts = [
  mk('1', 'Learning about Claude Code today', 'gptaku_ai', '지피타쿠'),
  mk('2', 'A post about midjourney prompts', 'promppy_com', 'Promppy'),
  mk('3', 'unrelated content', 'someone', 'Someone'),
];

describe('searchPosts', () => {
  it('returns [] for an empty query', () => {
    expect(searchPosts(posts, '   ')).toEqual([]);
  });
  it('matches post body case-insensitively', () => {
    expect(searchPosts(posts, 'claude').map((p) => p.id)).toEqual(['1']);
  });
  it('matches username and display name', () => {
    expect(searchPosts(posts, 'promppy').map((p) => p.id)).toEqual(['2']);
    expect(searchPosts(posts, '지피타쿠').map((p) => p.id)).toEqual(['1']);
  });
  it('returns nothing when there is no match', () => {
    expect(searchPosts(posts, 'zzznope')).toEqual([]);
  });

  it('requires ALL terms to match (AND) across body and author', () => {
    // both terms present (one in body, one in handle) → match
    expect(searchPosts(posts, 'claude gptaku').map((p) => p.id)).toEqual(['1']);
    // one term missing → no match
    expect(searchPosts(posts, 'claude midjourney')).toEqual([]);
  });

  it('matches the post memo when notes are provided', () => {
    const notes = { 'threads:3': 'remember this banger 꿀팁' };
    // the word only exists in the note, not the post text/author
    expect(searchPosts(posts, '꿀팁', notes).map((p) => p.id)).toEqual(['3']);
    // without notes, no match
    expect(searchPosts(posts, '꿀팁')).toEqual([]);
  });
});

describe('tokenize', () => {
  it('splits on whitespace and lowercases', () => {
    expect(tokenize('  Claude  CODE ')).toEqual(['claude', 'code']);
  });
  it('returns [] for blank input', () => {
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('accountMatches', () => {
  it('matches across username and display name with all terms', () => {
    expect(accountMatches('gptaku_ai', '지피타쿠', 'gptaku')).toBe(true);
    expect(accountMatches('gptaku_ai', '지피타쿠', 'gptaku zzz')).toBe(false);
  });
});
