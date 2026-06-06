'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import dynamic from 'next/dynamic';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import type { TopicGraph } from '@/lib/enrichmentStore';
import { NodePostsPopup } from './NodePostsPopup';

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
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const fittedRef = useRef(false);
  // The cluster "fog" sprites (one translucent coloured halo per cluster) + each cluster's
  // centroid/radius — used to draw the regions and to resolve a click to its cluster.
  const aurasRef = useRef<THREE.Group | null>(null);
  const centroidsRef = useRef<Map<string, { x: number; y: number; z: number; r: number }>>(new Map());
  const [width, setWidth] = useState(640);
  const [search, setSearch] = useState('');
  const [ready, setReady] = useState(false);
  const [focusGroup, setFocusGroup] = useState<string | null>(null);
  const [popupId, setPopupId] = useState<string | null>(null); // node whose feed is previewed

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
    setFocusGroup(null);
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

  // In-graph search: ids matching the query.
  const matchIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return new Set(graph.nodes.filter((n) => n.id.toLowerCase().includes(q)).map((n) => n.id));
  }, [search, graph.nodes]);

  // Ids of the focused cluster (a node's `group`), set by clicking a node.
  const focusIds = useMemo(() => {
    if (!focusGroup) return null;
    return new Set(graph.nodes.filter((n) => n.group === focusGroup).map((n) => n.id));
  }, [focusGroup, graph.nodes]);

  // What's highlighted right now — a search wins over a clicked cluster; null = show all.
  const activeIds = matchIds ?? focusIds;

  // Fly the camera to fit the search matches (graphData has no reliable positions here, so
  // cluster zoom is done in onNodeClick where the clicked node carries x/y/z).
  useEffect(() => {
    if (!matchIds || matchIds.size === 0) return;
    const t = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fgRef.current?.zoomToFit?.(600, 40, (n: any) => matchIds.has(n.id));
    }, 200);
    return () => clearTimeout(t);
  }, [matchIds]);

  // Fly the camera close to a clicked node (its position is reliable in the click event),
  // looking at it — zooms into that node's cluster.
  const flyTo = (n: { x: number; y: number; z: number }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fg: any = fgRef.current;
    if (!fg || typeof n.x !== 'number') return;
    const cam = fg.camera();
    const dx = cam.position.x - n.x, dy = cam.position.y - n.y, dz = cam.position.z - n.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    const dist = 150;
    fg.cameraPosition(
      { x: n.x + (dx / len) * dist, y: n.y + (dy / len) * dist, z: n.z + (dz / len) * dist },
      { x: n.x, y: n.y, z: n.z },
      700,
    );
  };

  // Back out to the framed overview (clears the focused cluster + any search).
  const clearFocus = () => {
    setFocusGroup(null);
    setSearch('');
    fgRef.current?.zoomToFit?.(600, 50);
  };

  // Exit a focused cluster. Zooming in pushes a history entry, so prefer popping it (browser
  // Back) — the popstate handler then clears focus, keeping the back button in sync with us.
  const flyOut = () => {
    if (typeof window !== 'undefined' && window.history.state?.graphFocus) window.history.back();
    else clearFocus();
  };

  // Zoom into a cluster. The first time (overview → focused) push a history entry so the
  // browser Back button backs out of the zoom.
  const enterFocus = (group: string, target?: { x: number; y: number; z: number }) => {
    setSearch('');
    if (!focusGroup && typeof window !== 'undefined') {
      try {
        window.history.pushState({ graphFocus: true }, '');
      } catch {
        /* history unavailable — fall back to in-page exits (Esc / empty click) */
      }
    }
    setFocusGroup(group);
    if (target) flyTo(target);
  };

  // Which cluster's fog (if any) sits under a screen point — raycast against the halos.
  const pickFog = (event: { clientX: number; clientY: number }): string | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fg: any = fgRef.current;
    const canvas = wrapRef.current?.querySelector('canvas');
    const grp = aurasRef.current;
    if (!fg?.camera || !canvas || !grp || grp.children.length === 0) return null;
    const rect = canvas.getBoundingClientRect();
    const ndc = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc as THREE.Vector2, fg.camera());
    const hits = ray.intersectObjects(grp.children, false);
    return hits.length ? (hits[0].object.userData.group as string) : null;
  };

  // Click a cluster's fog (empty region) to zoom in; once zoomed in, an empty click backs
  // out, and a precise node click opens that node's hub.
  const onBackgroundClick = (event: { clientX: number; clientY: number }) => {
    if (focusGroup) {
      flyOut(); // already zoomed in → any empty click exits the cluster
      return;
    }
    const group = pickFog(event);
    if (!group) return;
    enterFocus(group, centroidsRef.current.get(group));
  };

  const onNodeClick = (n: { id: string; group: string; x: number; y: number; z: number }) => {
    if (focusGroup === n.group) {
      setPopupId(n.id); // already in this cluster → preview the node's feed in a popup
      return;
    }
    enterFocus(n.group, n);
  };

  // Browser Back (popstate) backs out of a focused cluster.
  useEffect(() => {
    const onPop = () => clearFocus();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ESC also backs out of a focused cluster.
  useEffect(() => {
    if (!focusGroup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') flyOut();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusGroup]);

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

      // OrbitControls config: zoom toward the cursor (into an off-centre cluster), free
      // 360° horizontal + full vertical tilt, intuitive pan. (Orbit keeps programmatic
      // camera moves — cluster zoom / search fly-to — reliable, unlike trackball.)
      const controls = fgRef.current?.controls?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctl = controls as any;
      if (ctl && !ctl.__cfg) {
        ctl.zoomToCursor = true;
        ctl.screenSpacePanning = true;
        ctl.minPolarAngle = 0.0001;
        ctl.maxPolarAngle = Math.PI - 0.0001;
        ctl.__cfg = true;
      }
      const cv = wrapRef.current?.querySelector('canvas');
      if (cv) (cv as HTMLElement).style.cursor = 'grab';
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

  // Soft round haze texture (white → transparent), tinted per cluster on each sprite. One
  // canvas, shared by every fog blob.
  const auraTex = useMemo(() => {
    if (typeof document === 'undefined') return null; // server render — built on the client
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const cx = cv.getContext('2d')!;
    const g = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = g;
    cx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  }, []);

  // Build one translucent coloured "fog" sprite per cluster, sized to wrap its members, so
  // clusters read as distinct regions you can click. Rebuilt once the layout is framed
  // (positions are final) and whenever the data changes (topic ↔ entity toggle).
  useEffect(() => {
    if (!ready || !auraTex) return;
    const scene = fgRef.current?.scene?.();
    if (!scene) return;
    const prev = scene.getObjectByName('cluster-auras');
    if (prev) scene.remove(prev);

    type N = { group: string; count: number; color: string; x?: number; y?: number; z?: number };
    const nodes = data.nodes as ReadonlyArray<N>;
    // Pass 1 — centroid + colour per cluster.
    const acc = new Map<string, { x: number; y: number; z: number; n: number; color: string }>();
    for (const nd of nodes) {
      if (typeof nd.x !== 'number') continue;
      const a = acc.get(nd.group) ?? { x: 0, y: 0, z: 0, n: 0, color: nd.color };
      a.x += nd.x; a.y += nd.y!; a.z += nd.z!; a.n++;
      acc.set(nd.group, a);
    }
    if (acc.size === 0) return; // positions not ready yet
    const centroids = new Map<string, { x: number; y: number; z: number; r: number }>();
    for (const [g, a] of acc) centroids.set(g, { x: a.x / a.n, y: a.y / a.n, z: a.z / a.n, r: 0 });
    // Pass 2 — radius = farthest member from the centroid (+ its sphere radius).
    for (const nd of nodes) {
      if (typeof nd.x !== 'number') continue;
      const c = centroids.get(nd.group)!;
      const nodeR = 6 * Math.cbrt(Math.max(1, nd.count));
      const d = Math.hypot(nd.x - c.x, nd.y! - c.y, nd.z! - c.z) + nodeR;
      if (d > c.r) c.r = d;
    }

    const grp = new THREE.Group();
    grp.name = 'cluster-auras';
    for (const [g, c] of centroids) {
      const mat = new THREE.SpriteMaterial({
        map: auraTex,
        color: new THREE.Color(acc.get(g)!.color),
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      const sp = new THREE.Sprite(mat);
      sp.userData.group = g;
      sp.position.set(c.x, c.y, c.z);
      const size = Math.max(70, c.r + 44) * 2; // diameter; min keeps tiny clusters clickable
      sp.scale.set(size, size, 1);
      sp.renderOrder = -1;
      grp.add(sp);
    }
    scene.add(grp);
    aurasRef.current = grp;
    centroidsRef.current = centroids;
  }, [ready, data, auraTex]);

  // Dim the other clusters' fog when one is focused, so the active region stands out.
  useEffect(() => {
    const grp = aurasRef.current;
    if (!grp) return;
    for (const sp of grp.children) {
      const m = (sp as THREE.Sprite).material as THREE.SpriteMaterial;
      // Flown in, the focused cluster's fog sits near the camera and fills the view, so keep
      // it a faint tint; dim the rest; show all at a readable haze when zoomed out.
      m.opacity = focusGroup ? (sp.userData.group === focusGroup ? 0.12 : 0.05) : 0.18;
    }
  }, [focusGroup, ready]);

  // Custom node objects: a gradient-shaded sphere (light top → colour → dark bottom) + its
  // label. Geometry is shared and one material is cached per colour (≈ a handful total), so
  // 40 nodes cost almost nothing. Re-runs only when the search highlight changes.
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 18, 18), []);
  const matCache = useRef(new Map<string, THREE.Material>());
  const nodeObject = useCallback(
    (n: { id: string; count: number; color: string }) => {
      const dim = activeIds ? !activeIds.has(n.id) : false;
      // Keep a per-colour dim material so dimmed nodes hold a MUTED version of their own
      // type/cluster colour (not flat grey) — the legend colours stay readable when focused.
      const key = dim ? n.color + '__dim' : n.color;
      let mat = matCache.current.get(key);
      if (!mat) {
        const full = new THREE.Color(n.color);
        const base = dim ? full.clone().lerp(new THREE.Color('#22232a'), 0.5) : full;
        const light = base.clone().lerp(new THREE.Color(0xffffff), dim ? 0.18 : 0.55);
        const dark = base.clone().multiplyScalar(dim ? 0.55 : 0.3);
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
      s.color = dim ? 'rgba(170,173,182,0.55)' : '#eef1f5';
      // Smaller + low variance so big-count labels don't dominate or overlap their neighbours.
      s.textHeight = 4.5 + Math.min(2.5, n.count * 0.28);
      s.fontWeight = '600';
      // A subtle dark chip so an overlapping label stays readable (nearer one draws on top).
      s.backgroundColor = dim ? 'rgba(9,10,15,0.4)' : 'rgba(9,10,15,0.62)';
      s.padding = 0.6;
      s.borderRadius = 2;
      (s as unknown as { position: { y: number } }).position.y = r + 4.5 + Math.cbrt(Math.max(1, n.count)) * 1.4;
      group.add(s);
      return group;
    },
    [activeIds, sphereGeo],
  );

  // Is a link entirely inside the active (focused/searched) set? Such links stay bright; the
  // rest fade. (After layout the lib swaps source/target for the node objects.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkInFocus = (l: any) => {
    if (!activeIds) return false;
    const s = typeof l.source === 'object' && l.source ? l.source.id : l.source;
    const t = typeof l.target === 'object' && l.target ? l.target.id : l.target;
    return activeIds.has(s) && activeIds.has(t);
  };

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

        {/* Back out of a focused cluster — always visible while zoomed in. */}
        {focusGroup && (
          <button
            type="button"
            onClick={flyOut}
            className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-black/55 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm hover:bg-black/75"
          >
            ← 전체 보기 <span className="text-white/50">(뒤로가기 · Esc)</span>
          </button>
        )}

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
          // Zoomed into a cluster, keep its internal links bright (so the connections stay
          // visible) and fade only the unrelated ones — not every link.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linkColor={(l: any) =>
            !activeIds ? 'rgba(170,175,190,0.22)' : linkInFocus(l) ? 'rgba(210,215,230,0.6)' : 'rgba(120,125,140,0.05)'
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linkWidth={(l: any) => {
            const base = Math.min(2, 0.4 + (l.weight ?? 1) * 0.4);
            return activeIds && linkInFocus(l) ? base + 0.7 : base;
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linkDirectionalParticles={(l: any) => (!activeIds ? 2 : linkInFocus(l) ? 2 : 0)}
          linkDirectionalParticleWidth={1.4}
          linkDirectionalParticleColor={() => 'rgba(200,205,220,0.8)'}
          // Click a cluster's coloured region (its fog) to zoom in — no need to hit a node
          // precisely. Zoomed in, an empty click backs out; a node click opens its hub.
          onNodeClick={onNodeClick}
          onBackgroundClick={(event: MouseEvent) => onBackgroundClick(event)}
          onNodeHover={(node: unknown) => {
            const cv = wrapRef.current?.querySelector('canvas');
            if (cv) (cv as HTMLElement).style.cursor = node ? 'pointer' : 'grab';
          }}
        />
        </div>
        {/* Vignette shading — edges fall into shadow so the scene reads with depth. */}
        <div
          className="pointer-events-none absolute inset-0 z-[5]"
          style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 36%, rgba(0,0,0,0.32) 72%, rgba(0,0,0,0.62) 100%)' }}
        />
      </div>
      <p className="mt-2 px-2 text-xs text-secondary">
        {focusGroup ? (
          <>
            <span className="text-fg">「{kind === 'entity' ? ENTITY_LABEL[focusGroup] ?? focusGroup : focusGroup}」</span>{' '}
            클러스터로 확대됨 · 노드를 클릭하면 피드 팝업, 뒤로가기·빈 곳·Esc로 빠져나오기 ·{' '}
            <button
              type="button"
              onClick={() => {
                setFocusGroup(null);
                setSearch('');
                fgRef.current?.zoomToFit?.(600, 50);
              }}
              className="text-fg hover:underline"
            >
              전체 보기
            </button>
          </>
        ) : (
          <>
            {graph.nodes.length}개 · {graph.edges.length}개 연결 · 색 = {kind === 'entity' ? '타입' : '클러스터'}, 크기 = 포스트
            수 · 클러스터 영역(컬러 포그)을 클릭하면 확대 · 드래그 회전 · 휠 줌
          </>
        )}
      </p>

      {popupId && (
        <NodePostsPopup
          kind={kind === 'entity' ? 'entity' : 'topic'}
          id={popupId}
          hubHref={`${hrefBase}${encodeURIComponent(popupId)}`}
          onClose={() => setPopupId(null)}
        />
      )}
    </div>
  );
}
