import Link from 'next/link';
import { getAllSavedPosts } from '@/lib/postStore';
import { searchPosts, tokenize, accountMatches } from '@/lib/search';
import { getAccounts } from '@/lib/accountStore';
import { Feed } from '@/components/Feed';
import { SearchBox } from '@/components/SearchBox';
import { AccountIcon } from '@/components/AccountIcon';
import { Highlight } from '@/components/Highlight';

export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const query = q.trim();
  const terms = tokenize(query);

  const posts = query ? searchPosts(getAllSavedPosts(), query) : [];
  const accounts = query
    ? getAccounts().filter((a) => accountMatches(a.username, a.username, query))
    : [];

  return (
    <>
      <div className="px-4 pt-4">
        <SearchBox initial={query} />
      </div>

      {!query ? (
        <p className="px-4 py-16 text-center text-secondary">
          Search saved posts and accounts.
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
            <Feed posts={posts} highlight={terms} />
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
