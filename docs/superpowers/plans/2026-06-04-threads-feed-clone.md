# Threads Feed Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Next.js app that scrapes public Threads accounts and renders their feed with a Threads-identical UI — an aggregated home feed across a configured account list plus a per-account view, with dark/light theme toggle.

**Architecture:** Server-side scraper (`lib/threads.ts`) fetches `threads.com/@username` with browser-like headers and a pure parser (`lib/parse.ts`) extracts post data from embedded `<script type="application/json">` blocks, normalizing to domain types in `lib/types.ts`. Server components (`app/page.tsx`, `app/[username]/page.tsx`) call the scraper and pass normalized `Post[]` to presentation components that never touch raw scrape output.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind CSS, next-themes, next/image, Vitest + React Testing Library.

---

## File Structure

| File | Responsibility |
|---|---|
| `config/accounts.ts` | The configured username list for the aggregated feed |
| `lib/types.ts` | Domain types: `Author`, `Media`, `Stats`, `Post`, `ScrapeResult` |
| `lib/parse.ts` | Pure: HTML string → `Post[]` (no network) |
| `lib/threads.ts` | `fetchAccountFeed(username)` → `ScrapeResult` (network + parse) |
| `lib/format.ts` | `relativeTime()`, `formatCount()` pure helpers |
| `app/layout.tsx` | Root layout, fonts, `ThemeProvider` |
| `app/globals.css` | Tailwind + Threads color tokens (dark/light) |
| `app/page.tsx` | Aggregated home feed |
| `app/[username]/page.tsx` | Per-account feed |
| `components/Feed.tsx` | Renders a list of `PostCard` |
| `components/PostCard.tsx` | One post: header, body, media, action bar, chain |
| `components/ThreadChain.tsx` | Self-thread continuation posts with connector line |
| `components/Media.tsx` | Single image / carousel / video |
| `components/ActionBar.tsx` | like / reply / repost / share with counts |
| `components/Avatar.tsx` | Round avatar via next/image |
| `components/VerifiedBadge.tsx` | Blue verified check |
| `components/icons.tsx` | Inline SVG icons |
| `components/ThemeToggle.tsx` | Dark/light toggle button |
| `test/fixtures/profile-autogod.html` | Real captured profile page (already in repo) |
| `test/fixtures/web_profile_info-autogod.json` | Real captured IG profile JSON (already in repo) |

The two fixture files already exist in `test/fixtures/` (captured 2026-06-04). Do not regenerate them.

---

## Task 0: Scaffold project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, `test/setup.ts`, `app/globals.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "threads-feed-clone",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "15.1.6",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "next-themes": "0.4.4"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/react": "16.1.0",
    "@types/node": "22.10.5",
    "@types/react": "19.0.7",
    "@types/react-dom": "19.0.3",
    "@vitejs/plugin-react": "4.3.4",
    "autoprefixer": "10.4.20",
    "jsdom": "25.0.1",
    "postcss": "8.5.1",
    "tailwindcss": "3.4.17",
    "typescript": "5.7.3",
    "vitest": "2.1.8"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.mjs`** (allow Threads/Instagram CDN images)

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.cdninstagram.com' },
      { protocol: 'https', hostname: '*.fbcdn.net' },
    ],
  },
};
export default nextConfig;
```

- [ ] **Step 4: Create `postcss.config.mjs`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 5: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        secondary: 'rgb(var(--secondary) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 6: Create `app/globals.css`** (Threads palette)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: 255 255 255;
  --elevated: 255 255 255;
  --fg: 0 0 0;
  --secondary: 153 153 153;
  --border: 219 219 219;
}
.dark {
  --bg: 16 16 16;
  --elevated: 24 24 24;
  --fg: 243 245 247;
  --secondary: 119 119 119;
  --border: 47 47 47;
}
html, body { padding: 0; margin: 0; }
body {
  background: rgb(var(--bg));
  color: rgb(var(--fg));
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
```

- [ ] **Step 7: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
```

- [ ] **Step 8: Create `test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 9: Install dependencies**

Run: `npm install`
Expected: completes, creates `node_modules` and `package-lock.json`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + Vitest"
```

---

## Task 1: Domain types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write `lib/types.ts`** (no test — type-only module)

```ts
export interface Author {
  username: string;
  displayName: string;
  avatarUrl: string;
  verified: boolean;
}

export interface Media {
  type: 'image' | 'video';
  url: string;
  width: number;
  height: number;
  alt?: string;
}

export interface Stats {
  likes: number;
  replies: number;
  reposts: number;
  shares: number;
}

export interface Post {
  id: string;
  code: string;          // permalink slug
  author: Author;
  text: string;
  createdAt: number;     // unix seconds
  media: Media[];
  stats: Stats;
  chain: Post[];         // self-thread continuation posts (empty for single posts)
}

export type ScrapeResult =
  | { ok: true; posts: Post[] }
  | { ok: false; reason: 'private' | 'not_found' | 'blocked' | 'parse_error' };
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: domain types"
```

---

## Task 2: Extract JSON script blocks

**Files:**
- Create: `lib/parse.ts`
- Test: `lib/parse.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { extractJsonScripts } from './parse';

describe('extractJsonScripts', () => {
  it('returns the contents of each application/json script', () => {
    const html = `
      <html><head></head><body>
      <script type="application/json" data-sjs>{"a":1}</script>
      <script>console.log('ignore me')</script>
      <script type="application/json">{"b":[2,3]}</script>
      </body></html>`;
    const blocks = extractJsonScripts(html);
    expect(blocks).toEqual(['{"a":1}', '{"b":[2,3]}']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/parse.test.ts`
Expected: FAIL — `extractJsonScripts is not a function` (module has no export yet).

- [ ] **Step 3: Write minimal implementation in `lib/parse.ts`**

```ts
export function extractJsonScripts(html: string): string[] {
  const re = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1]);
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/parse.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/parse.ts lib/parse.test.ts
git commit -m "feat: extract embedded JSON script blocks"
```

---

## Task 3: Parse profile HTML into posts

**Files:**
- Modify: `lib/parse.ts`
- Test: `lib/parse.test.ts` (add cases using the real fixture)

The verified raw shape: somewhere in the parsed JSON tree are objects holding a `thread_items` array. Each thread is one card; `thread_items[0].post` is the lead post, the rest are self-thread continuations. A raw post has: `pk`, `code`, `taken_at`, `like_count`, `caption.text`, `user.{username,full_name,profile_pic_url,is_verified}`, `text_post_app_info.{direct_reply_count,repost_count,reshare_count}`, and media via `carousel_media[]` / `video_versions[]` / `image_versions2.candidates[]` with `media_type`.

- [ ] **Step 1: Write the failing tests** (append to `lib/parse.test.ts`)

```ts
import { readFileSync } from 'node:fs';
import { parseProfileHtml } from './parse';

describe('parseProfileHtml (real fixture)', () => {
  const html = readFileSync('test/fixtures/profile-autogod.html', 'utf8');
  const posts = parseProfileHtml(html);

  it('extracts at least one post', () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it('maps author from the lead post', () => {
    const p = posts[0];
    expect(p.author.displayName.length).toBeGreaterThan(0);
    expect(p.author.avatarUrl).toMatch(/^https:\/\//);
  });

  it('when a username is given, returns only that account\'s posts', () => {
    const onlyAutogod = parseProfileHtml(html, 'autogod.ai');
    expect(onlyAutogod.length).toBeGreaterThan(0);
    expect(onlyAutogod.every((p) => p.author.username === 'autogod.ai')).toBe(true);
  });

  it('maps id, code, text, createdAt and numeric stats', () => {
    const p = posts[0];
    expect(p.id.length).toBeGreaterThan(0);
    expect(p.code.length).toBeGreaterThan(0);
    expect(typeof p.createdAt).toBe('number');
    expect(p.createdAt).toBeGreaterThan(1000000000);
    expect(typeof p.stats.likes).toBe('number');
    expect(typeof p.stats.replies).toBe('number');
    expect(typeof p.stats.reposts).toBe('number');
  });

  it('does not return duplicate post ids', () => {
    const ids = posts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/parse.test.ts`
Expected: FAIL — `parseProfileHtml is not a function`.

- [ ] **Step 3: Implement in `lib/parse.ts`** (append below `extractJsonScripts`)

```ts
import type { Author, Media, Post, Stats } from './types';

interface RawCandidate { url: string; width: number; height: number; }
interface RawPost {
  pk?: string; id?: string; code?: string; taken_at?: number; like_count?: number;
  media_type?: number; accessibility_caption?: string;
  caption?: { text?: string } | null;
  user?: {
    username?: string; full_name?: string; profile_pic_url?: string; is_verified?: boolean;
  };
  text_post_app_info?: {
    direct_reply_count?: number; repost_count?: number; reshare_count?: number;
  } | null;
  image_versions2?: { candidates?: RawCandidate[] } | null;
  video_versions?: { url: string; width?: number; height?: number }[] | null;
  carousel_media?: RawPost[] | null;
}
interface RawThread { thread_items?: { post?: RawPost }[]; id?: string }

function collectThreads(node: unknown, acc: RawThread[]): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectThreads(item, acc);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj.thread_items)) acc.push(obj as RawThread);
  for (const key of Object.keys(obj)) collectThreads(obj[key], acc);
}

function pickImage(p: RawPost): Media | null {
  const candidates = p.image_versions2?.candidates;
  if (!candidates || candidates.length === 0) return null;
  const best = candidates.reduce((a, b) => (b.width > a.width ? b : a));
  return { type: 'image', url: best.url, width: best.width, height: best.height, alt: p.accessibility_caption };
}

function buildMedia(p: RawPost): Media[] {
  if (p.carousel_media && p.carousel_media.length > 0) {
    return p.carousel_media.map(buildSingleMedia).filter((m): m is Media => m !== null);
  }
  const single = buildSingleMedia(p);
  return single ? [single] : [];
}

function buildSingleMedia(p: RawPost): Media | null {
  if (p.video_versions && p.video_versions.length > 0) {
    const v = p.video_versions[0];
    return { type: 'video', url: v.url, width: v.width ?? 0, height: v.height ?? 0, alt: p.accessibility_caption };
  }
  return pickImage(p);
}

function mapAuthor(u: RawPost['user']): Author {
  return {
    username: u?.username ?? '',
    displayName: u?.full_name ?? u?.username ?? '',
    avatarUrl: u?.profile_pic_url ?? '',
    verified: Boolean(u?.is_verified),
  };
}

function mapStats(p: RawPost): Stats {
  const t = p.text_post_app_info ?? {};
  return {
    likes: p.like_count ?? 0,
    replies: t.direct_reply_count ?? 0,
    reposts: t.repost_count ?? 0,
    shares: t.reshare_count ?? 0,
  };
}

function mapPost(p: RawPost): Post | null {
  if (!p.pk && !p.id) return null;
  return {
    id: String(p.pk ?? p.id),
    code: p.code ?? '',
    author: mapAuthor(p.user),
    text: p.caption?.text ?? '',
    createdAt: p.taken_at ?? 0,
    media: buildMedia(p),
    stats: mapStats(p),
    chain: [],
  };
}

// A profile page also embeds recommended/related threads from OTHER accounts.
// When `username` is provided, keep only threads whose lead post is by that account.
export function parseProfileHtml(html: string, username?: string): Post[] {
  const wanted = username ? username.trim().replace(/^@+/, '').toLowerCase() : null;
  const threads: RawThread[] = [];
  for (const block of extractJsonScripts(html)) {
    let data: unknown;
    try { data = JSON.parse(block); } catch { continue; }
    collectThreads(data, threads);
  }
  const byId = new Map<string, Post>();
  for (const thread of threads) {
    const items = (thread.thread_items ?? []).map((i) => i.post).filter((p): p is RawPost => !!p);
    if (items.length === 0) continue;
    const lead = mapPost(items[0]);
    if (!lead) continue;
    if (wanted && lead.author.username.toLowerCase() !== wanted) continue;
    lead.chain = items.slice(1).map(mapPost).filter((p): p is Post => p !== null);
    if (!byId.has(lead.id)) byId.set(lead.id, lead);
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/parse.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/parse.ts lib/parse.test.ts
git commit -m "feat: parse profile HTML into normalized posts"
```

---

## Task 4: Format helpers

**Files:**
- Create: `lib/format.ts`
- Test: `lib/format.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { formatCount, relativeTime } from './format';

describe('formatCount', () => {
  it('shows small numbers as-is', () => {
    expect(formatCount(0)).toBe('');
    expect(formatCount(42)).toBe('42');
  });
  it('abbreviates thousands and millions', () => {
    expect(formatCount(1200)).toBe('1.2K');
    expect(formatCount(15000)).toBe('15K');
    expect(formatCount(2500000)).toBe('2.5M');
  });
});

describe('relativeTime', () => {
  const now = 1_700_000_000;
  it('formats seconds, minutes, hours, days, weeks', () => {
    expect(relativeTime(now - 30, now)).toBe('30s');
    expect(relativeTime(now - 120, now)).toBe('2m');
    expect(relativeTime(now - 3 * 3600, now)).toBe('3h');
    expect(relativeTime(now - 2 * 86400, now)).toBe('2d');
    expect(relativeTime(now - 21 * 86400, now)).toBe('3w');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/format.test.ts`
Expected: FAIL — module not found / functions undefined.

- [ ] **Step 3: Write `lib/format.ts`**

```ts
export function formatCount(n: number): string {
  if (!n || n <= 0) return '';
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const v = n / 1000;
    return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + 'K';
  }
  const v = n / 1_000_000;
  return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + 'M';
}

export function relativeTime(unixSeconds: number, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const diff = Math.max(0, nowSeconds - unixSeconds);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / (7 * 86400))}w`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/format.ts lib/format.test.ts
git commit -m "feat: count and relative-time formatters"
```

---

## Task 5: Scraper (network + parse)

**Files:**
- Create: `lib/threads.ts`
- Test: `lib/threads.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fetchAccountFeed } from './threads';

const html = readFileSync('test/fixtures/profile-autogod.html', 'utf8');

afterEach(() => vi.restoreAllMocks());

describe('fetchAccountFeed', () => {
  it('returns ok with posts when the page parses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(html, { status: 200 })));
    const res = await fetchAccountFeed('autogod.ai');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.posts.length).toBeGreaterThan(0);
  });

  it('returns not_found on 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const res = await fetchAccountFeed('nope');
    expect(res).toEqual({ ok: false, reason: 'not_found' });
  });

  it('returns blocked on other non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })));
    const res = await fetchAccountFeed('autogod.ai');
    expect(res).toEqual({ ok: false, reason: 'blocked' });
  });

  it('returns parse_error when no posts are found', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html></html>', { status: 200 })));
    const res = await fetchAccountFeed('autogod.ai');
    expect(res).toEqual({ ok: false, reason: 'parse_error' });
  });

  it('strips a leading @ from the username in the URL', async () => {
    const spy = vi.fn(async () => new Response(html, { status: 200 }));
    vi.stubGlobal('fetch', spy);
    await fetchAccountFeed('@autogod.ai');
    expect(spy.mock.calls[0][0]).toBe('https://www.threads.com/@autogod.ai');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/threads.test.ts`
Expected: FAIL — `fetchAccountFeed is not a function`.

- [ ] **Step 3: Write `lib/threads.ts`**

```ts
import { parseProfileHtml } from './parse';
import type { ScrapeResult } from './types';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@+/, '');
}

export async function fetchAccountFeed(username: string): Promise<ScrapeResult> {
  const handle = normalizeUsername(username);
  const url = `https://www.threads.com/@${handle}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: BROWSER_HEADERS });
  } catch {
    return { ok: false, reason: 'blocked' };
  }
  if (res.status === 404) return { ok: false, reason: 'not_found' };
  if (!res.ok) return { ok: false, reason: 'blocked' };
  const html = await res.text();
  const posts = parseProfileHtml(html, handle);
  if (posts.length === 0) return { ok: false, reason: 'parse_error' };
  return { ok: true, posts };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/threads.test.ts`
Expected: PASS (all 5 cases).

- [ ] **Step 5: Commit**

```bash
git add lib/threads.ts lib/threads.test.ts
git commit -m "feat: account feed scraper"
```

---

## Task 6: Account config

**Files:**
- Create: `config/accounts.ts`

- [ ] **Step 1: Write `config/accounts.ts`**

```ts
export const ACCOUNTS: string[] = [
  'autogod.ai', 'ai.yeongseon', 'manus', 'gptaku_ai', 'reels_code_official',
  'ai_tusol', 'fast.ports.ai', 'promppy_com', 'hyle.ai.kr', 'crealwork',
  'algovaultai', 'anelo_tech', 'mceo.atm', 'yoonkwon_ai', 'mapilnyeo',
  'choi.openai', 'glow.aistudio', 'sangwon.ropefree', 'freainer', 'let.s.ai',
  'peebiki', 'aicoffeechat', 'aiowner_', 'codecasper_ai',
];
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add config/accounts.ts
git commit -m "feat: configured account list"
```

---

## Task 7: Icons + Avatar + VerifiedBadge

**Files:**
- Create: `components/icons.tsx`, `components/Avatar.tsx`, `components/VerifiedBadge.tsx`
- Test: `components/Avatar.test.tsx`

- [ ] **Step 1: Write `components/icons.tsx`** (Threads action icons as inline SVG)

```tsx
type P = { className?: string };
const base = 'h-[22px] w-[22px]';

export function HeartIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? base}>
      <path d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5.5 5.5 5.5c1.9 0 3 1 2.5 1.5C9.5 5.5 10.5 5 12 5s2.5.5 4 2c-.5-.5.6-1.5 2.5-1.5 3 0 4.5 3 3 6C19 15.65 12 20 12 20z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
export function ReplyIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? base}>
      <path d="M12 21c5 0 9-3.6 9-8.5S17 4 12 4 3 7.6 3 12.5c0 1.7.5 3.3 1.4 4.6L3 21l4.3-1.2c1.4.8 3 1.2 4.7 1.2z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
export function RepostIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? base}>
      <path d="M7 7h9l-2-2M17 17H8l2 2M17 7v8M7 17V9" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
export function ShareIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? base}>
      <path d="M22 3 11 14M22 3l-7 19-4-8-8-4 19-7z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
export function MoreIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className ?? 'h-5 w-5'}>
      <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
```

- [ ] **Step 2: Write `components/VerifiedBadge.tsx`**

```tsx
export function VerifiedBadge() {
  return (
    <svg viewBox="0 0 24 24" className="ml-1 inline-block h-[15px] w-[15px] align-middle" aria-label="Verified">
      <path fill="#0095F6" d="M12 1l2.4 2.1 3.2-.3 1.3 2.9 2.9 1.3-.3 3.2L24 12l-2.1 2.4.3 3.2-2.9 1.3-1.3 2.9-3.2-.3L12 23l-2.4-2.1-3.2.3-1.3-2.9L2.2 17l.3-3.2L0 12l2.1-2.4-.3-3.2L4.7 5l1.3-2.9 3.2.3z" />
      <path fill="#fff" d="M10.6 14.6l-2.2-2.2-1.2 1.2 3.4 3.4 6-6-1.2-1.2z" />
    </svg>
  );
}
```

- [ ] **Step 3: Write the failing test `components/Avatar.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders an image with the username as alt', () => {
    render(<Avatar src="https://example.com/a.jpg" username="zuck" size={36} />);
    const img = screen.getByAltText('zuck');
    expect(img).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run components/Avatar.test.tsx`
Expected: FAIL — cannot find `./Avatar`.

- [ ] **Step 5: Write `components/Avatar.tsx`**

```tsx
import Image from 'next/image';

export function Avatar({ src, username, size = 36 }: { src: string; username: string; size?: number }) {
  return (
    <Image
      src={src}
      alt={username}
      width={size}
      height={size}
      className="rounded-full object-cover"
      unoptimized
    />
  );
}
```

(Note: `unoptimized` avoids the Next image optimizer needing to proxy short-lived CDN URLs.)

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run components/Avatar.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/icons.tsx components/VerifiedBadge.tsx components/Avatar.tsx components/Avatar.test.tsx
git commit -m "feat: icons, avatar, verified badge"
```

---

## Task 8: ActionBar

**Files:**
- Create: `components/ActionBar.tsx`
- Test: `components/ActionBar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActionBar } from './ActionBar';

describe('ActionBar', () => {
  it('shows formatted like and reply counts, hides zeros', () => {
    render(<ActionBar stats={{ likes: 1200, replies: 4, reposts: 0, shares: 0 }} />);
    expect(screen.getByText('1.2K')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ActionBar.test.tsx`
Expected: FAIL — cannot find `./ActionBar`.

- [ ] **Step 3: Write `components/ActionBar.tsx`**

```tsx
import type { Stats } from '@/lib/types';
import { formatCount } from '@/lib/format';
import { HeartIcon, ReplyIcon, RepostIcon, ShareIcon } from './icons';

function Action({ icon, count }: { icon: React.ReactNode; count: number }) {
  const label = formatCount(count);
  return (
    <button className="flex items-center gap-1 rounded-full p-2 -m-2 text-fg hover:bg-elevated" type="button">
      {icon}
      {label && <span className="text-[13px] text-fg">{label}</span>}
    </button>
  );
}

export function ActionBar({ stats }: { stats: Stats }) {
  return (
    <div className="mt-2 flex items-center gap-5 text-fg">
      <Action icon={<HeartIcon />} count={stats.likes} />
      <Action icon={<ReplyIcon />} count={stats.replies} />
      <Action icon={<RepostIcon />} count={stats.reposts} />
      <Action icon={<ShareIcon />} count={stats.shares} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ActionBar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ActionBar.tsx components/ActionBar.test.tsx
git commit -m "feat: action bar"
```

---

## Task 9: Media

**Files:**
- Create: `components/Media.tsx`
- Test: `components/Media.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MediaView } from './Media';
import type { Media } from '@/lib/types';

describe('MediaView', () => {
  it('renders nothing for empty media', () => {
    const { container } = render(<MediaView media={[]} />);
    expect(container.firstChild).toBeNull();
  });
  it('renders an image', () => {
    const media: Media[] = [{ type: 'image', url: 'https://x/a.jpg', width: 100, height: 100, alt: 'pic' }];
    render(<MediaView media={media} />);
    expect(screen.getByAltText('pic')).toBeInTheDocument();
  });
  it('renders a video element', () => {
    const media: Media[] = [{ type: 'video', url: 'https://x/v.mp4', width: 100, height: 100 }];
    const { container } = render(<MediaView media={media} />);
    expect(container.querySelector('video')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/Media.test.tsx`
Expected: FAIL — cannot find `./Media`.

- [ ] **Step 3: Write `components/Media.tsx`**

```tsx
import Image from 'next/image';
import type { Media } from '@/lib/types';

function Item({ m }: { m: Media }) {
  if (m.type === 'video') {
    return (
      <video src={m.url} controls playsInline className="h-full w-full rounded-[8px] object-cover" />
    );
  }
  return (
    <Image
      src={m.url}
      alt={m.alt ?? ''}
      width={m.width || 500}
      height={m.height || 500}
      className="h-full w-full rounded-[8px] object-cover"
      unoptimized
    />
  );
}

export function MediaView({ media }: { media: Media[] }) {
  if (media.length === 0) return null;
  if (media.length === 1) {
    return (
      <div className="mt-2 max-h-[430px] overflow-hidden rounded-[8px] border border-border">
        <Item m={media[0]} />
      </div>
    );
  }
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto">
      {media.map((m, i) => (
        <div key={i} className="aspect-square w-[70%] flex-none overflow-hidden rounded-[8px] border border-border">
          <Item m={m} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/Media.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/Media.tsx components/Media.test.tsx
git commit -m "feat: media (image/carousel/video)"
```

---

## Task 10: PostCard

**Files:**
- Create: `components/PostCard.tsx`
- Test: `components/PostCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostCard } from './PostCard';
import type { Post } from '@/lib/types';

const post: Post = {
  id: '1', code: 'abc',
  author: { username: 'zuck', displayName: 'Mark', avatarUrl: 'https://x/a.jpg', verified: true },
  text: 'hello threads', createdAt: Math.floor(Date.now() / 1000) - 3600,
  media: [], stats: { likes: 5, replies: 1, reposts: 0, shares: 0 }, chain: [],
};

describe('PostCard', () => {
  it('renders username, body, time and a link to the profile', () => {
    render(<PostCard post={post} />);
    expect(screen.getByText('zuck')).toBeInTheDocument();
    expect(screen.getByText('hello threads')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /zuck/ });
    expect(link).toHaveAttribute('href', '/@zuck');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/PostCard.test.tsx`
Expected: FAIL — cannot find `./PostCard`.

- [ ] **Step 3: Write `components/PostCard.tsx`**

```tsx
import Link from 'next/link';
import type { Post } from '@/lib/types';
import { relativeTime } from '@/lib/format';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';
import { MoreIcon } from './icons';
import { MediaView } from './Media';
import { ActionBar } from './ActionBar';
import { ThreadChain } from './ThreadChain';

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="flex gap-3 border-b border-border px-4 py-3">
      <div className="flex flex-col items-center">
        <Link href={`/@${post.author.username}`}>
          <Avatar src={post.author.avatarUrl} username={post.author.username} size={36} />
        </Link>
        {post.chain.length > 0 && <div className="mt-2 w-[2px] flex-1 bg-border" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[15px]">
          <Link href={`/@${post.author.username}`} className="font-semibold text-fg hover:underline">
            {post.author.username}
          </Link>
          {post.author.verified && <VerifiedBadge />}
          <span className="text-secondary">· {relativeTime(post.createdAt)}</span>
          <button type="button" className="ml-auto text-secondary"><MoreIcon /></button>
        </div>
        {post.text && <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-[1.4] text-fg">{post.text}</p>}
        <MediaView media={post.media} />
        <ActionBar stats={post.stats} />
        <ThreadChain posts={post.chain} />
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/PostCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/PostCard.tsx components/PostCard.test.tsx
git commit -m "feat: post card"
```

---

## Task 11: ThreadChain

**Files:**
- Create: `components/ThreadChain.tsx`
- Test: `components/ThreadChain.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThreadChain } from './ThreadChain';
import type { Post } from '@/lib/types';

const child: Post = {
  id: '2', code: 'def',
  author: { username: 'zuck', displayName: 'Mark', avatarUrl: 'https://x/a.jpg', verified: false },
  text: 'second in thread', createdAt: Math.floor(Date.now() / 1000),
  media: [], stats: { likes: 0, replies: 0, reposts: 0, shares: 0 }, chain: [],
};

describe('ThreadChain', () => {
  it('renders nothing when empty', () => {
    const { container } = render(<ThreadChain posts={[]} />);
    expect(container.firstChild).toBeNull();
  });
  it('renders chained post text', () => {
    render(<ThreadChain posts={[child]} />);
    expect(screen.getByText('second in thread')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ThreadChain.test.tsx`
Expected: FAIL — cannot find `./ThreadChain`.

- [ ] **Step 3: Write `components/ThreadChain.tsx`**

```tsx
import type { Post } from '@/lib/types';
import { Avatar } from './Avatar';
import { MediaView } from './Media';
import { ActionBar } from './ActionBar';

export function ThreadChain({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  return (
    <div className="mt-1">
      {posts.map((p) => (
        <div key={p.id} className="flex gap-3 pt-3">
          <Avatar src={p.author.avatarUrl} username={p.author.username} size={28} />
          <div className="min-w-0 flex-1">
            <span className="text-[15px] font-semibold text-fg">{p.author.username}</span>
            {p.text && <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-[1.4] text-fg">{p.text}</p>}
            <MediaView media={p.media} />
            <ActionBar stats={p.stats} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ThreadChain.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ThreadChain.tsx components/ThreadChain.test.tsx
git commit -m "feat: self-thread chain"
```

---

## Task 12: Feed

**Files:**
- Create: `components/Feed.tsx`
- Test: `components/Feed.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Feed } from './Feed';
import type { Post } from '@/lib/types';

const mk = (id: string, text: string): Post => ({
  id, code: id,
  author: { username: 'u' + id, displayName: 'U', avatarUrl: 'https://x/a.jpg', verified: false },
  text, createdAt: 1, media: [], stats: { likes: 0, replies: 0, reposts: 0, shares: 0 }, chain: [],
});

describe('Feed', () => {
  it('renders all posts', () => {
    render(<Feed posts={[mk('1', 'one'), mk('2', 'two')]} />);
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
  });
  it('renders an empty state when there are no posts', () => {
    render(<Feed posts={[]} />);
    expect(screen.getByText(/No posts/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/Feed.test.tsx`
Expected: FAIL — cannot find `./Feed`.

- [ ] **Step 3: Write `components/Feed.tsx`**

```tsx
import type { Post } from '@/lib/types';
import { PostCard } from './PostCard';

export function Feed({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return <p className="px-4 py-16 text-center text-secondary">No posts to show.</p>;
  }
  return (
    <div>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/Feed.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/Feed.tsx components/Feed.test.tsx
git commit -m "feat: feed list"
```

---

## Task 13: Theme toggle + layout

**Files:**
- Create: `components/ThemeToggle.tsx`, `app/layout.tsx`, `components/Providers.tsx`

- [ ] **Step 1: Write `components/Providers.tsx`**

```tsx
'use client';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Write `components/ThemeToggle.tsx`**

```tsx
'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-8 w-8" />;
  const isDark = resolvedTheme === 'dark';
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="rounded-full p-2 text-fg hover:bg-elevated"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
```

- [ ] **Step 3: Write `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Threads',
  description: 'Threads feed clone',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="mx-auto min-h-screen max-w-[640px] border-x border-border bg-bg">
            <header className="sticky top-0 z-10 flex items-center justify-between bg-bg/80 px-4 py-3 backdrop-blur">
              <Link href="/" className="text-lg font-bold text-fg">Threads</Link>
              <ThemeToggle />
            </header>
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/Providers.tsx components/ThemeToggle.tsx app/layout.tsx
git commit -m "feat: layout, theme provider and toggle"
```

---

## Task 14: Aggregated home feed page

**Files:**
- Create: `app/page.tsx`

The home page fetches every configured account concurrently, skips failures, merges all posts, and sorts newest-first.

- [ ] **Step 1: Write `app/page.tsx`**

```tsx
import { ACCOUNTS } from '@/config/accounts';
import { fetchAccountFeed } from '@/lib/threads';
import { Feed } from '@/components/Feed';
import type { Post } from '@/lib/types';

export const revalidate = 300; // cache scrapes for 5 minutes

export default async function HomePage() {
  const results = await Promise.allSettled(ACCOUNTS.map((u) => fetchAccountFeed(u)));
  const posts: Post[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.ok) posts.push(...r.value.posts);
  }
  posts.sort((a, b) => b.createdAt - a.createdAt);
  return <Feed posts={posts} />;
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: aggregated home feed"
```

---

## Task 15: Per-account page

**Files:**
- Create: `app/[username]/page.tsx`

The route param will be like `@autogod.ai` (or `autogod.ai`); `fetchAccountFeed` normalizes the leading `@`.

- [ ] **Step 1: Write `app/[username]/page.tsx`**

```tsx
import { fetchAccountFeed, normalizeUsername } from '@/lib/threads';
import { Feed } from '@/components/Feed';

export const revalidate = 300;

export default async function AccountPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const handle = normalizeUsername(decodeURIComponent(username));
  const result = await fetchAccountFeed(handle);

  if (!result.ok) {
    const msg =
      result.reason === 'not_found' ? 'Account not found.'
      : result.reason === 'private' ? 'This account is private.'
      : 'Could not load this account right now.';
    return <p className="px-4 py-16 text-center text-secondary">{msg}</p>;
  }

  return (
    <>
      <h2 className="px-4 pt-4 text-xl font-bold text-fg">@{handle}</h2>
      <Feed posts={result.posts} />
    </>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`, then open `http://localhost:3000/@autogod.ai`.
Expected: the account's posts render in a Threads-style feed; the theme toggle switches dark/light. Also open `http://localhost:3000/` and confirm the aggregated feed renders (may take a few seconds while it scrapes all accounts). Stop the server with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add app/[username]/page.tsx
git commit -m "feat: per-account feed page"
```

---

## Task 16: Full test run + README + push to GitHub

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all test files PASS.

- [ ] **Step 2: Production build check**

Run: `npm run build`
Expected: build succeeds (no type or lint errors).

- [ ] **Step 3: Write `README.md`**

```markdown
# Threads Feed Clone

A Next.js app that scrapes public Threads accounts and renders their feed with a
Threads-identical UI: an aggregated home feed across a configured account list,
plus a per-account view, with a dark/light theme toggle.

## How it works

`lib/threads.ts` fetches `https://www.threads.com/@<username>` server-side with
browser-like headers, and `lib/parse.ts` extracts post data from the embedded
`<script type="application/json">` blocks, normalizing to the domain types in
`lib/types.ts`. The scraper is the only source-specific module — the UI consumes
only normalized `Post` objects.

> Note: scraping relies on Threads' current page structure and may break if Meta
> changes it. Fixes are isolated to `lib/parse.ts` / `lib/threads.ts`.

## Develop

    npm install
    npm run dev      # http://localhost:3000
    npm test

## Configure accounts

Edit `config/accounts.ts` to change which accounts appear in the aggregated feed.
Visit `/@<username>` for any single public account.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: README"
```

- [ ] **Step 5: Create the GitHub repo and push**

Run:
```bash
gh repo create threads-feed-clone --public --source=. --remote=origin --push
```
Expected: repo created and the default branch pushed. If `gh` is not authenticated, run `gh auth login` first (interactive — the user runs it).

- [ ] **Step 6: Verify the push**

Run: `gh repo view --web` (opens the repo) or `git remote -v && git log --oneline -5`
Expected: origin points at the new GitHub repo and commits are present.

---

## Notes for the implementer

- **Server-only scraping:** `lib/threads.ts` must only ever run in server components / server context (it is, via `app/page.tsx` and `app/[username]/page.tsx`). Never import it into a `'use client'` component.
- **`revalidate = 300`** caches each scrape for 5 minutes so repeated views don't re-hit Threads constantly.
- **Image domains** are configured in `next.config.mjs`; CDN image URLs are short-lived, hence `unoptimized` on `next/image`.
- **Private/blocked accounts** surface as the empty/error state rather than crashing the page.
- **ReplyFacepile deferred:** the spec listed a "X and N others replied" facepile row. The
  profile-page scrape provides a `direct_reply_count` (already shown in the action bar) but
  not the replier avatars needed for a facepile, so the standalone facepile is intentionally
  omitted rather than faked. If a future data source exposes repliers, add it as a component
  consumed by `PostCard` without touching the scraper contract.
```
