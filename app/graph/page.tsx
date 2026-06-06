import Link from 'next/link';
import { topicGraph, entityGraph } from '@/lib/enrichmentStore';
import { TopicGraphView } from '@/components/TopicGraphView';

export const dynamic = 'force-dynamic';

// The visual peak of the "connect" layer: a force-directed map of how topics — or
// entities — relate across the archive. Toggle the two connection axes via ?view=.
export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const isEntities = view === 'entities';
  // Edges at weight ≥ 1 — in a modest archive most topic pairs co-occur only once, so a
  // higher threshold leaves the graph nearly edgeless (a scatter, not a connection map).
  const graph = isEntities ? entityGraph(40, 1) : topicGraph(40, 1);

  return (
    <>
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold text-fg">그래프</h1>
        <p className="text-sm text-secondary">
          {isEntities ? '엔티티' : '토픽'}가 어떻게 연결되는지 — 군집이 주제를 드러냅니다. 노드에 마우스를
          올려 이웃을 보고, 클릭해 허브로.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border px-4 py-2">
        {[
          { key: 'topics', label: '토픽', href: '/graph' },
          { key: 'entities', label: '엔티티', href: '/graph?view=entities' },
        ].map((t) => {
          const on = (t.key === 'entities') === isEntities;
          return (
            <Link
              key={t.key}
              href={t.href}
              className={
                'rounded-full border px-3 py-1 text-xs ' +
                (on ? 'border-fg bg-fg text-bg' : 'border-border text-secondary hover:text-fg')
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <TopicGraphView
        graph={graph}
        hrefBase={isEntities ? '/entities?e=' : '/topics?t='}
        unit={isEntities ? '엔티티' : '토픽'}
      />
    </>
  );
}
