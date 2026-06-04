import Link from 'next/link';
import { getAllSavedPosts } from '@/lib/postStore';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap, allPostTags, tagCounts, keysWithTag } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { searchPosts, tokenize, accountMatches } from '@/lib/search';
import { getAccounts } from '@/lib/accountStore';
import { Feed } from '@/components/Feed';
import { FeedSummary } from '@/components/FeedSummary';
import { SearchBox } from '@/components/SearchBox';
import { AccountIcon } from '@/components/AccountIcon';
import { Highlight } from '@/components/Highlight';
import type { Post } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q = '', tag = '' } = await searchParams;
  const query = q.trim();
  const activeTag = tag.trim().toLowerCase();
  const terms = tokenize(query);

  const tagMap = getTagMap();
  const noteMap = getNoteMap();
  const savedKeys = [...bookmarkedKeys()];
  const counts = tagCounts();
  const tags = allPostTags();

  // Tag search takes precedence: every post carrying #activeTag, across all feeds.
  let posts: Post[] = [];
  let accounts: ReturnType<typeof getAccounts> = [];
  if (activeTag) {
    const keys = keysWithTag(activeTag);
    posts = getAllSavedPosts().filter((p) => keys.has(`${p.platform}:${p.id}`));
  } else if (query) {
    // Notes are searchable too — a query matches a post's text, author, tags, or memo.
    posts = searchPosts(getAllSavedPosts(), query, noteMap);
    accounts = getAccounts().filter((a) => accountMatches(a.username, a.username, query));
  }

  function tagChip(t: string) {
    const on = activeTag === t;
    return (
      <Link
        key={t}
        href={`/search?tag=${encodeURIComponent(t)}`}
        className={
          'rounded-full border px-3 py-1 text-xs ' +
          (on ? 'border-fg bg-fg text-bg' : 'border-border text-secondary hover:text-fg')
        }
      >
        #{t} <span className="opacity-60">{counts[t]}</span>
      </Link>
    );
  }

  return (
    <>
      <div className="px-4 pt-4">
        <SearchBox initial={activeTag ? `#${activeTag}` : query} />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-2">{tags.map(tagChip)}</div>
      )}

      {activeTag ? (
        <>
          <p className="px-4 pt-3 text-sm text-secondary">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'} tagged{' '}
            <span className="text-fg">#{activeTag}</span>
          </p>
          {posts.length > 0 ? (
            <>
              <FeedSummary posts={posts} />
              <Feed posts={posts} savedKeys={savedKeys} tagMap={tagMap} noteMap={noteMap} />
            </>
          ) : (
            <p className="px-4 py-16 text-center text-secondary">No posts tagged #{activeTag} yet.</p>
          )}
        </>
      ) : !query ? (
        <p className="px-4 py-16 text-center text-secondary">
          Search posts and accounts, or pick a #tag above.
        </p>
      ) : (
        <>
          <p className="px-4 pt-3 text-sm text-secondary">
            {posts.length} posts · {accounts.length} accounts for “{query}”
          </p>

          {accounts.length > 0 && (
            <div className="border-b border-border px-4 py-2">
              {accounts.map((a) => (
                <Link
                  key={`${a.platform}:${a.username}`}
                  href={a.platform === 'x' ? `/x/${a.username}` : `/@${a.username}`}
                  className="flex items-center gap-2 py-1.5 text-fg hover:underline"
                >
                  <AccountIcon src={a.avatarUrl} username={a.username} size={28} />
                  <Highlight text={a.username} terms={terms} />
                  <span className="rounded bg-elevated px-1.5 py-0.5 text-[11px] text-secondary">
                    {a.platform === 'x' ? 'X' : 'Threads'}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {posts.length > 0 ? (
            <>
              <FeedSummary posts={posts} />
              <Feed posts={posts} highlight={terms} savedKeys={savedKeys} tagMap={tagMap} noteMap={noteMap} />
            </>
          ) : (
            <p className="px-4 py-16 text-center text-secondary">
              No saved posts match. Crawl accounts from the manage tab to build the
              searchable archive.
            </p>
          )}
        </>
      )}
    </>
  );
}
