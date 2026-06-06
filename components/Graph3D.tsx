'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
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
  const fittedRef = useRef(false);
  const [width, setWidth] = useState(640);
  const [search, setSearch] = useState('');
  const [ready, setReady] = useState(false);

  // Fit the view exactly once, then reveal the canvas — so the user never sees the layout
  // spread or the camera zoom (the jank); they just see the finished, framed graph fade in.
  const fitOnce = () => {
    if (fittedRef.current) return;
    fittedRef.current = true;
    fgRef.current?.zoomToFit?.(0, 40); // instant fit (no animation) behind the hidden canvas
    setTimeout(() => setReady(true), 60);
  };

  // Reset per graph; a fallback timer covers the rare case onEngineStop never fires.
  useEffect(() => {
    fittedRef.current = false;
    setReady(false);
    const t = setTimeout(fitOnce, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

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

  // Add a starfield + subtle depth fog to the 3D scene so rotation reads as 3D motion
  // (a flat single-colour background gives no spatial reference). Added once the graph's
  // Three.js scene exists; persists across topic/entity toggles.
  useEffect(() => {
    let raf = 0;
    const add = () => {
      const scene = fgRef.current?.scene?.();
      if (!scene) {
        raf = requestAnimationFrame(add);
        return;
      }
      if (!scene.getObjectByName('starfield')) {
        // Soft round glow texture (one canvas, shared by every star → no perf cost).
        const cv = document.createElement('canvas');
        cv.width = cv.height = 64;
        const cx = cv.getContext('2d')!;
        const g = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.25, 'rgba(255,255,255,0.9)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        cx.fillStyle = g;
        cx.fillRect(0, 0, 64, 64);
        const tex = new THREE.CanvasTexture(cv);

        // Two layers: big bright near stars + smaller dimmer far stars → depth.
        const layer = (count: number, rMin: number, rMax: number, size: number, opacity: number, color: number) => {
          const pos = new Float32Array(count * 3);
          for (let i = 0; i < count; i++) {
            const r = rMin + Math.random() * (rMax - rMin);
            const th = Math.random() * Math.PI * 2;
            const ph = Math.acos(2 * Math.random() - 1);
            pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
            pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
            pos[i * 3 + 2] = r * Math.cos(ph);
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          const mat = new THREE.PointsMaterial({
            color,
            size,
            map: tex,
            sizeAttenuation: true,
            transparent: true,
            opacity,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          return new THREE.Points(geo, mat);
        };
        const stars = new THREE.Group();
        stars.name = 'starfield';
        // Soft glow (the texture) keeps small stars visible without rivalling the nodes.
        stars.add(layer(300, 800, 1700, 5, 0.8, 0xdfe7ff)); // near
        stars.add(layer(1300, 1700, 3400, 2.6, 0.5, 0xaab6d8)); // far, dim
        scene.add(stars);
      }
      if (!scene.fog) scene.fog = new THREE.FogExp2(0x0b0c12, 0.0007);

      // Planet-like shading: dim the ambient and add one directional "sun" so each sphere
      // shows a lit side + a shadowed side (a terminator). Lighting only — no per-node
      // meshes/textures — so it costs nothing per node.
      if (!scene.getObjectByName('graph-sun')) {
        scene.children.forEach((c: THREE.Object3D) => {
          if (c.type === 'AmbientLight') (c as THREE.AmbientLight).intensity = 0.5;
        });
        const sun = new THREE.DirectionalLight(0xffffff, 1.4);
        sun.position.set(0.6, 1, 0.8);
        sun.name = 'graph-sun';
        scene.add(sun);
      }

      // Zoom toward the cursor (not the universe origin), so you can zoom into an
      // off-centre cluster. screenSpacePanning makes drag-pan intuitive.
      const controls = fgRef.current?.controls?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = controls as any;
      if (c && !c.__zoomCursorSet) {
        c.zoomToCursor = true;
        c.screenSpacePanning = true;
        c.__zoomCursorSet = true;
      }
    };
    raf = requestAnimationFrame(add);
    return () => cancelAnimationFrame(raf);
  }, []);

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

  // Custom node objects: a gradient-shaded sphere (light top → colour → dark bottom) + its
  // label. Geometry is shared and one material is cached per colour (≈ a handful total), so
  // 40 nodes cost almost nothing. Re-runs only when the search highlight changes.
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 18, 18), []);
  const matCache = useRef(new Map<string, THREE.Material>());
  const nodeObject = useCallback(
    (n: { id: string; count: number; color: string }) => {
      const dim = matchIds ? !matchIds.has(n.id) : false;
      const key = dim ? '__dim' : n.color;
      let mat = matCache.current.get(key);
      if (!mat) {
        const base = new THREE.Color(dim ? '#3a3b44' : n.color);
        const light = base.clone().lerp(new THREE.Color(0xffffff), dim ? 0.12 : 0.55);
        const dark = base.clone().multiplyScalar(dim ? 0.7 : 0.3);
        const cv = document.createElement('canvas');
        cv.width = 8;
        cv.height = 64;
        const cx = cv.getContext('2d')!;
        const g = cx.createLinearGradient(0, 0, 0, 64);
        g.addColorStop(0, '#' + light.getHexString());
        g.addColorStop(0.45, '#' + base.getHexString());
        g.addColorStop(1, '#' + dark.getHexString());
        cx.fillStyle = g;
        cx.fillRect(0, 0, 8, 64);
        mat = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cv), roughness: 0.7, metalness: 0.05 });
        matCache.current.set(key, mat);
      }
      const r = 6 * Math.cbrt(Math.max(1, n.count));
      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.scale.setScalar(r);
      const group = new THREE.Group();
      group.add(mesh);
      const s = new SpriteText(n.id);
      s.color = dim ? 'rgba(150,152,160,0.4)' : '#f3f5f7';
      s.textHeight = 7 + Math.min(7, n.count * 0.7);
      s.fontWeight = '600';
      (s as unknown as { position: { y: number } }).position.y = r + 6 + Math.cbrt(Math.max(1, n.count)) * 2;
      group.add(s);
      return group;
    },
    [matchIds, sphereGeo],
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

        {/* Hidden until laid out + framed, so the spread/zoom animation is never seen. */}
        {!ready && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-white/50">
            그래프 배치 중…
          </div>
        )}
        <div className="transition-opacity duration-500" style={{ opacity: ready ? 1 : 0 }}>
        <ForceGraph3D
          ref={fgRef}
          graphData={data}
          width={width}
          height={520}
          backgroundColor="#0b0c12"
          showNavInfo={false}
          enableNodeDrag={false}
          nodeId="id"
          nodeVal={(n: { count: number }) => Math.max(1, n.count)}
          controlType="orbit"
          warmupTicks={40}
          cooldownTicks={120}
          onEngineStop={fitOnce}
          nodeLabel={(n: { id: string; count: number }) => `${n.id} · 포스트 ${n.count}개`}
          nodeThreeObjectExtend={false}
          nodeThreeObject={nodeObject}
          linkColor={() => (matchIds ? 'rgba(120,125,140,0.08)' : 'rgba(170,175,190,0.22)')}
          linkWidth={(l: { weight: number }) => Math.min(2, 0.4 + (l.weight ?? 1) * 0.4)}
          linkDirectionalParticles={matchIds ? 0 : 2}
          linkDirectionalParticleWidth={1.4}
          linkDirectionalParticleColor={() => 'rgba(200,205,220,0.8)'}
          onNodeClick={(n: { id: string }) => router.push(`${hrefBase}${encodeURIComponent(n.id)}`)}
        />
        </div>
        {/* Vignette shading — edges fall into shadow so the scene reads with depth. */}
        <div
          className="pointer-events-none absolute inset-0 z-[5]"
          style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 36%, rgba(0,0,0,0.32) 72%, rgba(0,0,0,0.62) 100%)' }}
        />
      </div>
      <p className="mt-2 px-2 text-xs text-secondary">
        {graph.nodes.length}개 · {graph.edges.length}개 연결 · 색 = {kind === 'entity' ? '타입' : '클러스터'}, 크기 =
        포스트 수. 드래그 회전 · 휠 줌 · 노드 클릭 시 허브.
      </p>
    </div>
  );
}
