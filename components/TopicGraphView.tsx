'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TopicGraph } from '@/lib/enrichmentStore';

// Dependency-free 3D co-occurrence "space": nodes are laid out in 3D by a small force sim,
// then projected to 2D with perspective (near nodes bigger + brighter → depth). Drag to
// orbit the camera; it drifts slowly when idle. Hover focuses a node's neighbourhood and
// shows info; click opens the hub. Topics OR entities (hrefBase / unit).

interface Node3 {
  id: string;
  count: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

const W = 620;
const H = 480;
const CX = W / 2;
const CY = H / 2;
const FOCAL = 620;
const R0 = 150; // layout sphere radius

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
  const [rot, setRot] = useState({ yaw: 0.5, pitch: -0.35 });
  const [, force] = useState(0);

  const nodesRef = useRef<Node3[]>([]);
  const drag = useRef<{ on: boolean; x: number; y: number; moved: boolean }>({ on: false, x: 0, y: 0, moved: false });
  const hoverRef = useRef<string | null>(null);
  hoverRef.current = hover;

  const maxCount = useMemo(() => Math.max(1, ...graph.nodes.map((n) => n.count)), [graph.nodes]);
  const defaultLabels = useMemo(() => new Set(graph.nodes.slice(0, 14).map((n) => n.id)), [graph.nodes]);
  const trunc = (s: string) => (s.length > 12 ? s.slice(0, 11) + '…' : s);

  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of graph.edges) {
      (m.get(e.a) ?? m.set(e.a, new Set()).get(e.a)!).add(e.b);
      (m.get(e.b) ?? m.set(e.b, new Set()).get(e.b)!).add(e.a);
    }
    return m;
  }, [graph.edges]);

  // 3D force layout — run once per graph. Fibonacci-sphere seed, then repulsion + edge
  // springs + centering, all in 3D.
  useEffect(() => {
    const N = graph.nodes.length;
    const nodes: Node3[] = graph.nodes.map((n, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / Math.max(1, N));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return {
        id: n.id,
        count: n.count,
        x: R0 * Math.sin(phi) * Math.cos(theta),
        y: R0 * Math.sin(phi) * Math.sin(theta),
        z: R0 * Math.cos(phi),
        vx: 0,
        vy: 0,
        vz: 0,
      };
    });
    const idx = new Map(nodes.map((n, i) => [n.id, i]));
    const edges = graph.edges
      .map((e) => ({ a: idx.get(e.a), b: idx.get(e.b), w: e.weight }))
      .filter((e): e is { a: number; b: number; w: number } => e.a != null && e.b != null);

    for (let tick = 0; tick < 280; tick++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dz = nodes[i].z - nodes[j].z;
          const d2 = dx * dx + dy * dy + dz * dz || 0.01;
          const d = Math.sqrt(d2);
          const f = 2600 / d2;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          const fz = (dz / d) * f;
          nodes[i].vx += fx; nodes[i].vy += fy; nodes[i].vz += fz;
          nodes[j].vx -= fx; nodes[j].vy -= fy; nodes[j].vz -= fz;
        }
      }
      for (const e of edges) {
        const a = nodes[e.a];
        const b = nodes[e.b];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
        const f = (d - 64) * 0.012 * Math.min(3, e.w);
        const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
        a.vx += fx; a.vy += fy; a.vz += fz;
        b.vx -= fx; b.vy -= fy; b.vz -= fz;
      }
      for (const n of nodes) {
        n.vx += -n.x * 0.0015; n.vy += -n.y * 0.0015; n.vz += -n.z * 0.0015;
        n.x += n.vx; n.y += n.vy; n.z += n.vz;
        n.vx *= 0.86; n.vy *= 0.86; n.vz *= 0.86;
      }
    }
    nodesRef.current = nodes;
    force((v) => v + 1);
  }, [graph]);

  // Idle auto-rotation (paused while dragging or hovering) — the "floating in space" feel.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (!drag.current.on && !hoverRef.current) {
        setRot((r) => ({ ...r, yaw: r.yaw + 0.0018 }));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Drag to orbit.
  function onDown(e: React.MouseEvent) {
    drag.current = { on: true, x: e.clientX, y: e.clientY, moved: false };
  }
  function onMove(e: React.MouseEvent) {
    const d = drag.current;
    if (!d.on) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    d.x = e.clientX;
    d.y = e.clientY;
    setRot((r) => ({
      yaw: r.yaw + dx * 0.008,
      pitch: Math.max(-1.4, Math.min(1.4, r.pitch + dy * 0.008)),
    }));
  }
  function onUp() {
    drag.current.on = false;
  }

  // Project a 3D point through yaw→pitch rotation + perspective.
  function project(n: Node3) {
    const { yaw, pitch } = rot;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cx = Math.cos(pitch), sx = Math.sin(pitch);
    const x1 = n.x * cy + n.z * sy;
    const z1 = -n.x * sy + n.z * cy;
    const y1 = n.y * cx - z1 * sx;
    const z2 = n.y * sx + z1 * cx;
    const scale = FOCAL / (FOCAL + z2);
    return { x: CX + x1 * scale, y: CY + y1 * scale, depth: z2, scale };
  }

  const nodes = nodesRef.current;

  if (graph.nodes.length === 0) {
    return (
      <p className="px-4 py-16 text-center text-secondary">
        아직 그래프로 만들 {unit}이(가) 없습니다. 먼저 계정 관리에서 아카이브를 보강하세요.
      </p>
    );
  }

  const focus = hover ? new Set<string>([hover, ...(adj.get(hover) ?? [])]) : null;
  const proj = new Map(nodes.map((n) => [n.id, project(n)]));
  // Painter's order: far (large depth) first so near nodes draw on top.
  const order = [...nodes].sort((a, b) => (proj.get(b.id)!.depth - proj.get(a.id)!.depth));

  const hoverNode = hover ? graph.nodes.find((n) => n.id === hover) : null;
  const caption = hoverNode
    ? `${hoverNode.id} · 포스트 ${hoverNode.count}개 · 연결 ${adj.get(hoverNode.id)?.size ?? 0}개`
    : `${graph.nodes.length}개 ${unit} · ${graph.edges.length}개 연결 · 드래그하여 회전`;

  // Depth → opacity (near = bright). z2 roughly in [-R0, R0].
  const depthOpacity = (z: number) => Math.max(0.25, Math.min(1, 0.7 - z / (R0 * 2.4)));

  return (
    <div className="px-2 py-2">
      <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-b from-elevated/30 to-bg">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full select-none"
          style={{ touchAction: 'none', cursor: drag.current.on ? 'grabbing' : 'grab' }}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
        >
          {graph.edges.map((e, i) => {
            const a = proj.get(e.a);
            const b = proj.get(e.b);
            if (!a || !b) return null;
            const on = hover === e.a || hover === e.b;
            const off = focus ? !on : false;
            const op = off ? 0.05 : on ? 0.85 : depthOpacity((a.depth + b.depth) / 2) * 0.5;
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="currentColor"
                className={on ? 'text-fg' : 'text-secondary'}
                strokeWidth={on ? 1.4 : Math.min(2.4, 0.4 + e.weight * 0.25)}
                opacity={op}
              />
            );
          })}
          {order.map((n) => {
            const p = proj.get(n.id)!;
            const on = hover === n.id;
            const dim = focus ? !focus.has(n.id) : false;
            const r = (5 + (n.count / maxCount) * 16) * p.scale;
            const showLabel = focus ? focus.has(n.id) : defaultLabels.has(n.id) || on;
            const op = dim ? 0.18 : depthOpacity(p.depth);
            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y})`}
                opacity={op}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => {
                  if (!drag.current.moved) router.push(`${hrefBase}${encodeURIComponent(n.id)}`);
                }}
                style={{ cursor: 'pointer' }}
              >
                {on && <circle r={r + 5} className="fill-fg/20" />}
                <circle r={r} className={on ? 'fill-fg' : 'fill-fg/80'} />
                {showLabel && (
                  <text
                    y={-r - 4}
                    textAnchor="middle"
                    className={'pointer-events-none fill-fg ' + (on ? 'font-semibold' : '')}
                    style={{ fontSize: Math.max(9, 11 * p.scale) }}
                  >
                    {on ? n.id : trunc(n.id)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-between px-2 text-xs text-secondary">
        <span>{caption}.</span>
        <button
          type="button"
          onClick={() => setRot({ yaw: 0.5, pitch: -0.35 })}
          className="rounded-full px-2 py-0.5 hover:bg-elevated hover:text-fg"
        >
          ⟲ 시점 초기화
        </button>
      </div>
    </div>
  );
}
