'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TopicGraph } from '@/lib/enrichmentStore';

// Dependency-free force-directed co-occurrence graph (topics OR entities). A tiny spring
// simulation runs once per graph, then renders to SVG. Node size ∝ post count.
// Interaction: hovering a node focuses its neighbourhood (dims the rest) and shows a info
// caption (name · posts · connections); clicking opens that node's hub (hrefBase).

interface Sim {
  id: string;
  count: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const W = 600;
const H = 460;

export function TopicGraphView({
  graph,
  hrefBase = '/topics?t=',
  unit = '토픽',
}: {
  graph: TopicGraph;
  hrefBase?: string;
  unit?: string;
}) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const [, force] = useState(0);
  const nodesRef = useRef<Sim[]>([]);

  const maxCount = useMemo(() => Math.max(1, ...graph.nodes.map((n) => n.count)), [graph.nodes]);

  // Declutter: by default only the biggest nodes show a label (graph.nodes is count-desc);
  // the rest reveal their label on hover. Long labels are truncated.
  const defaultLabels = useMemo(() => new Set(graph.nodes.slice(0, 14).map((n) => n.id)), [graph.nodes]);
  const trunc = (s: string) => (s.length > 12 ? s.slice(0, 11) + '…' : s);

  // Adjacency for neighbourhood focus + degree.
  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of graph.edges) {
      (m.get(e.a) ?? m.set(e.a, new Set()).get(e.a)!).add(e.b);
      (m.get(e.b) ?? m.set(e.b, new Set()).get(e.b)!).add(e.a);
    }
    return m;
  }, [graph.edges]);

  useEffect(() => {
    const N = graph.nodes.length;
    const nodes: Sim[] = graph.nodes.map((n, i) => {
      const a = (i / Math.max(1, N)) * Math.PI * 2;
      return { id: n.id, count: n.count, x: W / 2 + Math.cos(a) * 150, y: H / 2 + Math.sin(a) * 150, vx: 0, vy: 0 };
    });
    const idx = new Map(nodes.map((n, i) => [n.id, i]));
    const edges = graph.edges
      .map((e) => ({ a: idx.get(e.a), b: idx.get(e.b), w: e.weight }))
      .filter((e): e is { a: number; b: number; w: number } => e.a != null && e.b != null);

    for (let tick = 0; tick < 320; tick++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d2 = dx * dx + dy * dy || 0.01;
          const f = 2100 / d2; // a touch more repulsion → clusters separate clearly
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          nodes[i].vx += fx;
          nodes[i].vy += fy;
          nodes[j].vx -= fx;
          nodes[j].vy -= fy;
        }
      }
      for (const e of edges) {
        const a = nodes[e.a];
        const b = nodes[e.b];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - 58) * 0.013 * Math.min(3, e.w); // stronger pull → connected nodes cluster tighter
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
      for (const n of nodes) {
        n.vx += (W / 2 - n.x) * 0.002;
        n.vy += (H / 2 - n.y) * 0.002;
        n.x += n.vx;
        n.y += n.vy;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x = Math.max(20, Math.min(W - 20, n.x));
        n.y = Math.max(20, Math.min(H - 20, n.y));
      }
    }
    nodesRef.current = nodes;
    force((v) => v + 1);
  }, [graph]);

  const nodes = nodesRef.current;
  const pos = new Map(nodes.map((n) => [n.id, n]));

  if (graph.nodes.length === 0) {
    return (
      <p className="px-4 py-16 text-center text-secondary">
        아직 그래프로 만들 {unit}이(가) 없습니다. 먼저 계정 관리에서 아카이브를 보강하세요.
      </p>
    );
  }

  // Focus set: the hovered node + its neighbours (others are dimmed).
  const focus = hover ? new Set<string>([hover, ...(adj.get(hover) ?? [])]) : null;
  const dimmed = (id: string) => (focus ? !focus.has(id) : false);

  const hoverNode = hover ? graph.nodes.find((n) => n.id === hover) : null;
  const caption = hoverNode
    ? `${hoverNode.id} · 포스트 ${hoverNode.count}개 · 연결 ${adj.get(hoverNode.id)?.size ?? 0}개`
    : `${graph.nodes.length}개 ${unit} · ${graph.edges.length}개 연결 · 노드 크기 = 포스트 수`;

  return (
    <div className="px-2 py-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ touchAction: 'none' }}>
        {graph.edges.map((e, i) => {
          const a = pos.get(e.a);
          const b = pos.get(e.b);
          if (!a || !b) return null;
          const on = hover === e.a || hover === e.b;
          const off = focus ? !on : false;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="currentColor"
              className={on ? 'text-fg' : 'text-border'}
              strokeWidth={on ? 1.5 : Math.min(3, 0.5 + e.weight * 0.3)}
              opacity={off ? 0.08 : on ? 0.9 : 0.4}
            />
          );
        })}
        {nodes.map((n) => {
          const r = 6 + (n.count / maxCount) * 18;
          const on = hover === n.id;
          const dim = dimmed(n.id);
          // Show a label when hovering its neighbourhood, or (at rest) for the top nodes.
          const showLabel = focus ? focus.has(n.id) : defaultLabels.has(n.id) || on;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              className="cursor-pointer"
              opacity={dim ? 0.2 : 1}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => router.push(`${hrefBase}${encodeURIComponent(n.id)}`)}
            >
              <circle r={r} className={on ? 'fill-fg' : 'fill-fg/70'} />
              {showLabel && (
                <text
                  y={-r - 4}
                  textAnchor="middle"
                  className={'pointer-events-none fill-fg ' + (on ? 'font-semibold' : '')}
                  style={{ fontSize: 11 }}
                >
                  {on ? n.id : trunc(n.id)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="px-2 text-xs text-secondary">
        {caption}. {unit}을(를) 클릭하면 허브가 열립니다.
      </p>
    </div>
  );
}
