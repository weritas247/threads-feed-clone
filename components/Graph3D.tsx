'use client';

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import SpriteText from 'three-spritetext';
import type { TopicGraph } from '@/lib/enrichmentStore';

// WebGL 3D graph (react-force-graph-3d / Three.js). Real spheres + perspective, built-in
// orbit / zoom / pan, flowing link particles. COLOUR encodes category: a community cluster
// for topics, an entity type for entities (size still = post count). Client-only → loaded
// via next/dynamic with ssr:false.
// Loosely typed on purpose — the library's strict NodeObject/LinkObject accessor types
// fight our plain {id,count,group} shape; we feed it well-formed data either way.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] items-center justify-center text-sm text-secondary">3D 그래프 불러오는 중…</div>
  ),
}) as unknown as (props: Record<string, unknown> & { ref?: unknown }) => ReactElement;

// Vivid palette tuned for a dark background.
const PALETTE = ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#22d3ee', '#a3e635', '#f59e0b', '#e879f9', '#f87171', '#2dd4bf', '#c084fc'];
const ENTITY_COLORS: Record<string, string> = {
  tool: '#60a5fa',
  person: '#34d399',
  company: '#fbbf24',
  concept: '#a78bfa',
};
const ENTITY_LABEL: Record<string, string> = { tool: '도구', person: '인물', company: '회사', concept: '개념' };

export function Graph3D({
  graph,
  hrefBase = '/topics?t=',
  kind = 'topic',
}: {
  graph: TopicGraph;
  hrefBase?: string;
  kind?: 'topic' | 'entity';
}) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const [width, setWidth] = useState(640);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // In-graph search: ids matching the query are highlighted, the rest dimmed; the camera
  // flies to fit the matches.
  const matchIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return new Set(graph.nodes.filter((n) => n.id.toLowerCase().includes(q)).map((n) => n.id));
  }, [search, graph.nodes]);

  useEffect(() => {
    if (!matchIds || matchIds.size === 0) return;
    const t = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fgRef.current?.zoomToFit?.(600, 60, (n: any) => matchIds.has(n.id));
    }, 250);
    return () => clearTimeout(t);
  }, [matchIds]);

  // Fit the whole graph into view once it settles (belt-and-braces with onEngineStop).
  useEffect(() => {
    const t = setTimeout(() => fgRef.current?.zoomToFit?.(700, 50), 1200);
    return () => clearTimeout(t);
  }, [graph]);

  // Map each distinct group → a colour. Entities use fixed type colours; topic clusters
  // get palette colours ordered by cluster size (so the biggest clusters get stable hues).
  const { colorOf, legend } = useMemo(() => {
    const sizeByGroup = new Map<string, number>();
    for (const n of graph.nodes) sizeByGroup.set(n.group, (sizeByGroup.get(n.group) ?? 0) + n.count);
    const groups = [...sizeByGroup.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
    const map = new Map<string, string>();
    groups.forEach((g, i) => {
      map.set(g, kind === 'entity' ? ENTITY_COLORS[g] ?? PALETTE[i % PALETTE.length] : PALETTE[i % PALETTE.length]);
    });
    const colorOf = (g: string) => map.get(g) ?? '#9ca3af';
    const legend = groups
      .slice(0, 8)
      .map((g) => ({ group: g, color: colorOf(g), label: kind === 'entity' ? ENTITY_LABEL[g] ?? g : g }));
    return { colorOf, legend };
  }, [graph.nodes, kind]);

  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((n) => ({ id: n.id, count: n.count, group: n.group, color: colorOf(n.group) })),
      links: graph.edges.map((e) => ({ source: e.a, target: e.b, weight: e.weight })),
    }),
    [graph, colorOf],
  );

  if (graph.nodes.length === 0) {
    return (
      <p className="px-4 py-16 text-center text-secondary">
        아직 그래프로 만들 노드가 없습니다. 먼저 계정 관리에서 아카이브를 보강하세요.
      </p>
    );
  }

  return (
    <div className="px-2 py-2">
      <div ref={wrapRef} className="relative overflow-hidden rounded-xl border border-border" style={{ background: '#0b0c12' }}>
        {/* Legend */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-lg bg-black/40 px-2.5 py-2 text-[11px] text-white/90 backdrop-blur-sm">
          <span className="mb-0.5 font-semibold text-white/70">{kind === 'entity' ? '타입' : '클러스터'}</span>
          {legend.map((l) => (
            <span key={l.group} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: l.color }} />
              <span className="max-w-[140px] truncate">{l.label}</span>
            </span>
          ))}
        </div>

        {/* In-graph search */}
        <div className="absolute right-3 top-3 z-10 w-44">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${kind === 'entity' ? '엔티티' : '토픽'} 검색…`}
            className="w-full rounded-lg border border-white/15 bg-black/50 px-2.5 py-1.5 text-xs text-white outline-none backdrop-blur-sm placeholder:text-white/40"
          />
          {matchIds && (
            <p className="mt-1 px-1 text-[11px] text-white/70">
              {matchIds.size > 0 ? `${matchIds.size}개 일치` : '일치 없음'}
            </p>
          )}
        </div>

        <ForceGraph3D
          ref={fgRef}
          graphData={data}
          width={width}
          height={520}
          backgroundColor="#0b0c12"
          showNavInfo={false}
          enableNodeDrag={false}
          nodeId="id"
          nodeRelSize={6}
          nodeVal={(n: { count: number }) => Math.max(1, n.count)}
          nodeColor={(n: { id: string; color: string }) => (matchIds && !matchIds.has(n.id) ? '#33343c' : n.color)}
          nodeOpacity={0.95}
          nodeResolution={16}
          cooldownTicks={120}
          onEngineStop={() => fgRef.current?.zoomToFit?.(700, 30)}
          nodeLabel={(n: { id: string; count: number }) => `${n.id} · 포스트 ${n.count}개`}
          nodeThreeObjectExtend={true}
          nodeThreeObject={(n: { id: string; count: number; color: string }) => {
            const dim = matchIds ? !matchIds.has(n.id) : false;
            const s = new SpriteText(n.id);
            s.color = dim ? 'rgba(150,152,160,0.4)' : '#f3f5f7';
            s.textHeight = 7 + Math.min(7, n.count * 0.7);
            s.fontWeight = '600';
            // Lift the label just above the sphere (radius grows with count via nodeRelSize).
            // SpriteText extends THREE.Sprite at runtime; its types omit `position`.
            (s as unknown as { position: { y: number } }).position.y = 11 + Math.cbrt(Math.max(1, n.count)) * 7;
            return s;
          }}
          linkColor={() => (matchIds ? 'rgba(120,125,140,0.08)' : 'rgba(170,175,190,0.22)')}
          linkWidth={(l: { weight: number }) => Math.min(2, 0.4 + (l.weight ?? 1) * 0.4)}
          linkDirectionalParticles={matchIds ? 0 : 2}
          linkDirectionalParticleWidth={1.4}
          linkDirectionalParticleColor={() => 'rgba(200,205,220,0.8)'}
          onNodeClick={(n: { id: string }) => router.push(`${hrefBase}${encodeURIComponent(n.id)}`)}
        />
      </div>
      <p className="mt-2 px-2 text-xs text-secondary">
        {graph.nodes.length}개 · {graph.edges.length}개 연결 · 색 = {kind === 'entity' ? '타입' : '클러스터'}, 크기 =
        포스트 수. 드래그 회전 · 휠 줌 · 노드 클릭 시 허브.
      </p>
    </div>
  );
}
