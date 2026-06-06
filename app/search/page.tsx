import Link from 'next/link';
import { allKnowledgePosts } from '@/lib/pipeline';
import { bookmarkedKeys } from '@/lib/bookmarkStore';
import { getTagMap } from '@/lib/postTagStore';
import { getNoteMap } from '@/lib/postNoteStore';
import { getTopicMap, getEnrichmentMap } from '@/lib/enrichmentStore';
import { getStateMap, type CaptureState } from '@/lib/captureStateStore';
import { getEmbeddingMap } from '@/lib/embeddingStore';
import { getPreservedKeys } from '@/lib/preservedStore';
import { getEmbedder } from '@/lib/ai';
import { tokenize, accountMatches } from '@/lib/search';
import {
  parseFilters,
  applyFilters,
  hybridRank,
  sortPosts,
  computeFacets,
  activeFilterCount,
  type SearchContext,
  type SortMode,
} from '@/lib/searchQuery';
import { parseQuery, mergeFilters } from '@/lib/queryParse';
import { getAccounts } from '@/lib/accountStore';
import { Feed } from '@/components/Feed';
import { FeedSummary } from '@/components/FeedSummary';
import { SearchBox } from '@/components/SearchBox';
import { SearchFacets } from '@/components/SearchFacets';
import { SaveSearchButton } from '@/components/SaveSearchButton';
import { AccountIcon } from '@/components/AccountIcon';
import { Highlight } from '@/components/Highlight';
import type { Post } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | undefined>;

function qs(params: SP): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `/search?${s}` : '/search';
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const rawQ = (sp.q ?? '').trim();
  // The query box supports operators (@author, topic:ai, after:…). Parse them out: free
  // TEXT drives ranking; inline FILTERS merge with (and override) the facet URL params.
  const parsed = parseQuery(rawQ);
  const query = parsed.text;
  const terms = tokenize(query);
  const filters = mergeFilters(parseFilters(sp), parsed.filters);
  const nFilters = activeFilterCount(filters);

  const embedder = getEmbedder();
  const ctx: SearchContext = {
    enrichment: getEnrichmentMap(),
    state: getStateMap() as Record<string, CaptureState>,
    tagMap: getTagMap(),
    notes: getNoteMap(),
    vectors: getEmbeddingMap(),
    embedderId: embedder.id,
    preserved: new Set(getPreservedKeys()),
  };

  const all = allKnowledgePosts();
  const filtered = applyFilters(all, filters, ctx);

  // Default sort: relevance when there's a query, else newest.
  const sort: SortMode = (sp.sort as SortMode) || (query ? 'relevance' : 'recent');

  let results: Post[];
  if (query) {
    let qv: number[] | null = null;
    try {
      [qv] = await embedder.embed([query]);
    } catch {
      qv = null;
    }
    const ranked = hybridRank(filtered, query, qv, ctx);
    results = sort === 'relevance' ? ranked.map((r) => r.post) : sortPosts(ranked.map((r) => r.post), sort);
  } else {
    results = sortPosts(filtered, sort === 'relevance' ? 'recent' : sort);
  }

  const facets = computeFacets(results, ctx);
  const accounts = query ? getAccounts().filter((a) => accountMatches(a.username, a.username, query)) : [];

  const feedProps = {
    savedKeys: [...bookmarkedKeys()],
    tagMap: ctx.tagMap,
    noteMap: ctx.notes,
    topicMap: getTopicMap(),
    preservedKeys: [...getPreservedKeys()],
  };

  // Params passed to facet links (toggling a facet preserves q + sort + other filters).
  const baseParams: SP = { ...sp };

  const SORTS: { mode: SortMode; label: string }[] = [
    ...(query ? [{ mode: 'relevance' as const, label: '관련도' }] : []),
    { mode: 'recent', label: '최신' },
    { mode: 'engagement', label: '인기' },
  ];

  return (
    <>
      <div className="px-4 pt-4">
        <SearchBox initial={rawQ} />
      </div>

      <SearchFacets params={baseParams} facets={facets} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm">
        <span className="text-secondary">
          <span className="text-fg">{results.length}</span> 결과
          {query && <> · “{query}”</>}
          {nFilters > 0 && <> · 필터 {nFilters}</>}
        </span>
        {(rawQ || nFilters > 0) && (
          <>
            <Link
              href={rawQ ? `/search?q=${encodeURIComponent(rawQ)}` : '/search'}
              className="text-xs text-secondary hover:text-fg"
            >
              필터 초기화
            </Link>
            <SaveSearchButton query={qs(baseParams).replace(/^\/search\??/, '')} suggestedName={query || '저장된 검색'} />
          </>
        )}
        <span className="ml-auto flex items-center gap-0.5 text-xs">
          {SORTS.map((s) => {
            const on = sort === s.mode;
            return (
              <Link
                key={s.mode}
                href={qs({ ...baseParams, sort: s.mode })}
                className={'rounded-full px-2.5 py-1 ' + (on ? 'bg-elevated font-medium text-fg' : 'text-secondary hover:text-fg')}
              >
                {s.label}
              </Link>
            );
          })}
        </span>
      </div>

      {accounts.length > 0 && (
        <div className="border-y border-border px-4 py-2">
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

      {results.length > 0 ? (
        <>
          <FeedSummary posts={results} />
          <Feed posts={results} highlight={query ? terms : undefined} {...feedProps} />
        </>
      ) : (
        <p className="px-4 py-16 text-center text-secondary">
          {query || nFilters > 0
            ? '조건에 맞는 포스트가 없습니다. 필터를 줄이거나 검색어를 바꿔 보세요.'
            : '검색어를 입력하거나 위에서 필터를 선택하세요.'}
        </p>
      )}
    </>
  );
}
