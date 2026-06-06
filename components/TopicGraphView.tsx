'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TopicGraph } from '@/lib/enrichmentStore';

// Dependency-free force-directed graph of topic co-occurrence. A tiny spring simulation
// (repulsion + edge springs + centering) runs for a fixed number of ticks in a layout
// effect, then renders to SVG. Node size ∝ post count; clicking a node opens its hub.
// Deterministic initial placement (circle by index) so layout is stable across renders.

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

export function TopicGraphView({ graph }: { graph: TopicGraph }) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const [, force] = useState(0);
  const nodesRef = useRef<Sim[]>([]);

  const maxCount = useMemo(
    () => Math.max(1, ...graph.nodes.map((n) => n.count)),
    [graph.nodes],
  );

  // Build sim nodes once per graph; run the spring layout.
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
      // Repulsion between all pairs.
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d2 = dx * dx + dy * dy || 0.01;
          const f = 1800 / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          nodes[i].vx += fx;
          nodes[i].vy += fy;
          nodes[j].vx -= fx;
          nodes[j].vy -= fy;
        }
      }
      // Edge springs (stronger for higher weight).
      for (const e of edges) {
        const a = nodes[e.a];
        const b = nodes[e.b];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const target = 70;
        const f = (d - target) * 0.01 * Math.min(3, e.w);
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
      // Centering + integrate + damping.
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
    force((v) => v + 1); // commit
  }, [graph]);

  const nodes = nodesRef.current;
  const pos = new Map(nodes.map((n) => [n.id, n]));

  if (graph.nodes.length === 0) {
    return (
      <p className="px-4 py-16 text-center text-secondary">
        아직 그래프로 만들 토픽이 없습니다. 먼저 계정 관리에서 아카이브를 보강하세요.
      </p>
    );
  }

  return (
    <div className="px-2 py-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ touchAction: 'none' }}>
        {graph.edges.map((e, i) => {
          const a = pos.get(e.a);
          const b = pos.get(e.b);
          if (!a || !b) return null;
          const on = hover === e.a || hover === e.b;
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
              opacity={on ? 0.9 : 0.4}
            />
          );
        })}
        {nodes.map((n) => {
          const r = 6 + (n.count / maxCount) * 18;
          const on = hover === n.id;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              className="cursor-pointer"
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => router.push(`/topics?t=${encodeURIComponent(n.id)}`)}
            >
              <circle r={r} className={on ? 'fill-fg' : 'fill-fg/70'} />
              <text
                y={-r - 4}
                textAnchor="middle"
                className={'pointer-events-none fill-fg text-[11px] ' + (on ? 'font-semibold' : '')}
                style={{ fontSize: 11 }}
              >
                {n.id}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="px-2 text-xs text-secondary">
        토픽 {graph.nodes.length}개 · 연결 {graph.edges.length}개. 노드 크기 = 게시물 수, 선 = 함께
        등장하는 토픽. 토픽을 클릭하면 허브가 열립니다.
      </p>
    </div>
  );
}
