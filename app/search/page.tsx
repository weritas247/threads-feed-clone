import Link from 'next/link';
import { getAllSavedPosts } from '@/lib/postStore';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap, allPostTags, tagCounts, keysWithTag } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { getTopicMap } from '@/lib/enrichmentStore';
import { searchPosts, tokenize, accountMatches } from '@/lib/search';
import { getEmbedder } from '@/lib/ai';
import { rankByVector, mergeHybrid } from '@/lib/semanticSearch';
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
  let related: Post[] = [];
  let accounts: ReturnType<typeof getAccounts> = [];
  if (activeTag) {
    const keys = keysWithTag(activeTag);
    posts = getAllSavedPosts().filter((p) => keys.has(`${p.platform}:${p.id}`));
  } else if (query) {
    const all = getAllSavedPosts();
    // Exact: a query matches a post's text, author, tags, or memo.
    posts = searchPosts(all, query, noteMap);
    accounts = getAccounts().filter((a) => accountMatches(a.username, a.username, query));
    // Semantic recall: posts close in MEANING but not literal-matching the query. Needs
    // embedded posts (run the enrich pipeline); degrades to empty if none/embed fails.
    try {
      const embedder = getEmbedder();
      const [qv] = await embedder.embed([query]);
      const semantic = rankByVector(all, qv, embedder.id, 24, 0.1);
      related = mergeHybrid(posts, semantic).related.map((s) => s.item);
    } catch {
      related = [];
    }
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
            <span className="text-fg">#{activeTag}</span> 태그가 달린 포스트 {posts.length}개
          </p>
          {posts.length > 0 ? (
            <>
              <FeedSummary posts={posts} />
              <Feed posts={posts} savedKeys={savedKeys} tagMap={tagMap} noteMap={noteMap} topicMap={getTopicMap()} />
            </>
          ) : (
            <p className="px-4 py-16 text-center text-secondary">아직 #{activeTag} 태그가 달린 포스트가 없습니다.</p>
          )}
        </>
      ) : !query ? (
        <p className="px-4 py-16 text-center text-secondary">
          포스트와 계정을 검색하거나 위에서 #태그를 선택하세요.
        </p>
      ) : (
        <>
          <p className="px-4 pt-3 text-sm text-secondary">
“{query}” 검색 결과 · 포스트 {posts.length}개 · 계정 {accounts.length}개
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
              <Feed posts={posts} highlight={terms} savedKeys={savedKeys} tagMap={tagMap} noteMap={noteMap} topicMap={getTopicMap()} />
            </>
          ) : (
            <p className="px-4 py-10 text-center text-secondary">
              정확히 일치하는 결과가 없습니다{related.length > 0 ? ' — 아래에 의미상 관련된 포스트가 있습니다.' : '.'}
            </p>
          )}

          {related.length > 0 && (
            <>
              <div className="border-t border-border px-4 pb-1 pt-4">
                <h2 className="text-sm font-semibold text-fg">의미상 관련</h2>
                <p className="text-xs text-secondary">
                  “{query}”와 글자 그대로 일치하지는 않지만 의미상 비슷한 포스트 {related.length}개입니다.
                </p>
              </div>
              <Feed posts={related} savedKeys={savedKeys} tagMap={tagMap} noteMap={noteMap} topicMap={getTopicMap()} />
            </>
          )}
        </>
      )}
    </>
  );
}
