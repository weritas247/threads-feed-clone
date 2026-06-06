import Link from 'next/link';
import { allKnowledgePosts } from '@/lib/pipeline';
import { getEnrichmentMap } from '@/lib/enrichmentStore';
import { getStateMap, type CaptureState } from '@/lib/captureStateStore';
import { embeddedKeys } from '@/lib/embeddingStore';
import { listCollections } from '@/lib/collectionStore';
import { getEmbedder, getEnricher } from '@/lib/ai';
import { computeStats } from '@/lib/stats';
import { mediaArchiveStats } from '@/lib/mediaArchive';

export const dynamic = 'force-dynamic';

const TRIAGE_LABEL: Record<CaptureState, string> = {
  inbox: '받은함',
  kept: '킵',
  archived: '보관',
  discarded: '버림',
};

function Bar({ value, max, label, sub }: { value: number; max: number; label: string; sub?: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-fg">{label}</span>
        <span className="text-secondary">
          {value}
          {sub ? ` ${sub}` : ''}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-elevated">
        <div className="h-full rounded-full bg-fg/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ value, label, href }: { value: string | number; label: string; href?: string }) {
  const inner = (
    <div className="rounded-xl border border-border bg-elevated/40 px-4 py-3">
      <div className="text-2xl font-bold text-fg">{value}</div>
      <div className="text-xs text-secondary">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// North-star dashboard: is the knowledge base actually working? Coverage (how much is
// datafied), signal (worth-keeping ratio), triage progress, and the connection surface
// (topics/entities/collections).
export default function StatsPage() {
  const posts = allKnowledgePosts();
  const enricher = getEnricher();
  const embedder = getEmbedder();
  const s = computeStats({
    posts,
    enrichment: getEnrichmentMap(),
    state: getStateMap() as Record<string, CaptureState>,
    embeddedKeys: embeddedKeys(embedder.id),
    collections: listCollections(),
    promptVersion: enricher.promptVersion,
  });
  const media = mediaArchiveStats();
  const mediaMB = Math.round((media.bytes / (1024 * 1024)) * 10) / 10;

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-fg">지식 베이스 상태</h1>
      <p className="text-sm text-secondary">수집한 내용이 쓸 만한, 연결된 지식으로 바뀌고 있나요?</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat value={s.total} label="수집된 포스트" />
        <Stat value={`${s.coverage.enrichedPct}%`} label="데이터화" />
        <Stat value={`${Math.round(s.signal.avgKeepScore * 100)}%`} label="평균 신호" />
        <Stat value={s.topics.distinct} label="토픽" href="/topics" />
        <Stat value={s.entities.distinct} label="엔티티" href="/entities" />
        <Stat value={s.collections.count} label="컬렉션" href="/collections" />
      </div>

      <section className="mt-6">
        <h2 className="mb-1 text-sm font-semibold text-fg">커버리지</h2>
        <Bar value={s.coverage.enriched} max={s.total} label="보강됨 (AI 토픽/요약)" sub={`/ ${s.total}`} />
        <Bar value={s.coverage.embedded} max={s.total} label="임베딩됨 (의미 검색)" sub={`/ ${s.total}`} />
        <p className="mt-1 text-xs text-secondary">
          아카이브된 미디어: {media.files}개 파일 ({mediaMB} MB).{' '}
          {media.files === 0 && '크롤 시점에 미디어를 다운로드하려면 ARCHIVE_MEDIA=1을 설정하세요 (지속성).'}
        </p>
      </section>

      <section className="mt-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">트리아지</h2>
          <Link href="/inbox" className="text-xs text-secondary hover:text-fg">
            받은함으로 →
          </Link>
        </div>
        {(['inbox', 'kept', 'archived', 'discarded'] as CaptureState[]).map((st) => (
          <Bar key={st} value={s.triage[st]} max={s.total} label={TRIAGE_LABEL[st]} />
        ))}
        <p className="mt-1 text-xs text-secondary">
          신호 비율: 보강된 포스트 {s.coverage.enriched}개 중 {s.signal.highSignal}개가
          킵 점수 0.5 이상입니다 ({s.signal.highSignalPct}%).
        </p>
      </section>

      {s.byType.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-1 text-sm font-semibold text-fg">콘텐츠 유형</h2>
          <div className="flex flex-wrap gap-2">
            {s.byType.map((t) => (
              <span key={t.type} className="rounded-full bg-elevated px-3 py-1 text-xs text-secondary">
                {t.type} <span className="text-fg">{t.count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {s.topics.top.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-1 text-sm font-semibold text-fg">상위 토픽</h2>
          <div className="flex flex-wrap gap-2">
            {s.topics.top.map((t) => (
              <Link
                key={t.topic}
                href={`/topics?t=${encodeURIComponent(t.topic)}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-secondary hover:text-fg"
              >
                {t.topic} <span className="opacity-60">{t.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {s.entities.top.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-1 text-sm font-semibold text-fg">상위 엔티티</h2>
          <div className="flex flex-wrap gap-2">
            {s.entities.top.map((e) => (
              <Link
                key={e.name}
                href={`/entities?e=${encodeURIComponent(e.name)}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-secondary hover:text-fg"
              >
                {e.name} <span className="opacity-60">{e.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
