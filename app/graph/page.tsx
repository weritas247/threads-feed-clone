import { topicGraph } from '@/lib/enrichmentStore';
import { TopicGraphView } from '@/components/TopicGraphView';

export const dynamic = 'force-dynamic';

// The visual peak of the "connect" layer: a force-directed map of how topics relate
// across the archive. Built from the same enrichment the rest of the app uses.
export default function GraphPage() {
  const graph = topicGraph(40, 2);
  return (
    <>
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold text-fg">토픽 그래프</h1>
        <p className="text-sm text-secondary">토픽이 어떻게 연결되는지 — 군집이 주제를 드러냅니다.</p>
      </div>
      <TopicGraphView graph={graph} />
    </>
  );
}
