# Social Feed Clone (Threads + X) → Knowledge Base

A Next.js app that scrapes public **Threads** and **X (Twitter)** accounts and
renders their feed with a Threads-identical UI: an aggregated home feed across a
configured account list, plus per-account views, with a dark/light theme toggle.

On top of the feed it is a **personal knowledge base**: captured posts are
*datafied* (AI-extracted summary/topics/entities), *embedded* for semantic search,
*connected* (related posts + topic hubs), *triaged* (inbox → keep/archive/discard),
and *queried* (Ask-my-archive — a cited answer drawn only from your own posts). See
the "Knowledge base" section below and `docs/ROADMAP.md` for the full design.

## How it works

Each platform has one source-specific scraper that normalizes to the shared `Post`
type in `lib/types.ts`; `lib/feeds.ts` dispatches by platform. The rest of the app
(UI, management, crawling, storage, search) is platform-agnostic.

- **Threads** — `lib/threads.ts` fetches `https://www.threads.com/@<username>`
  server-side and `lib/parse.ts` extracts post data from the embedded
  `<script type="application/json">` blocks.
- **X** — `lib/x.ts` fetches the public embed timeline
  (`syndication.twitter.com/srv/timeline-profile/screen-name/<user>`) and parses
  its `__NEXT_DATA__`. No login required.

The UI consumes only normalized `Post` objects, so a source can be swapped or added
without touching any component. Per-account routes: `/@<user>` (Threads), `/x/<user>` (X).

- **Home (`/`)** — scrapes every account in `config/accounts.ts` concurrently,
  skips any that fail, merges all posts and sorts newest-first.
- **Per-account (`/@<username>`)** — a single public account's posts.

> Note: scraping relies on Threads' current page structure and may break if Meta
> changes it. Fixes are isolated to `lib/parse.ts` / `lib/threads.ts`.

## Develop

    npm install
    npm run dev      # http://localhost:4242
    npm test         # vitest
    npm run build && npm start   # production, also http://localhost:4242

## Crawl management (`/manage`)

A management tab to control crawling without editing code:

- Add / remove accounts and toggle each on/off (only enabled accounts appear in the
  home feed).
- Run a crawl per account, or "Crawl all enabled", and see each account's last
  status (OK / Private / Not found / Blocked / Parse error), post count, and time.
- Each crawl **saves the fetched posts** to disk (accumulating, deduped by id). Open
  a row's **Saved** link to browse the stored posts for that account at
  `/manage/<username>` — rendered from storage, no re-scraping.

State is persisted to `data/accounts.json` (a file, no database; git-ignored and
seeded from `config/accounts.ts` on first run). The relevant pieces:
`lib/accountStore.ts` (storage), `app/api/accounts` + `app/api/crawl` (actions),
`components/ManageClient.tsx` (UI).

## Saved feed (`/saved`) — your own Threads/X bookmarks

Posts you saved on Threads ("Saved") or X ("Bookmarks") are **private** — they never
appear in a public profile, so the crawler can't reach them. The Saved feed imports
them client-side so no credentials ever touch the server, reading only the API
responses the site already loads for the logged-in user.

**A) Chrome extension (one click, recommended)** — load the `extension/` folder via
`chrome://extensions` → Load unpacked. From its popup: open your Threads **Saved** or
X **Bookmarks** page, **Auto-scroll & capture**, then **Import to app**. Done — no
file. The extension also adds accounts from either site. See `extension/README.md`.

**B) Bookmarklet (no install)** —

1. On `/saved`, open **Import from Threads** and copy the bookmarklet into a new
   browser bookmark's URL.
2. Open your Threads **Saved page** while logged in and click the bookmark. It reads
   the page's embedded data, intercepts the feed API responses as it auto-scrolls
   your whole saved list, then downloads `threads-saved.json`.
3. Upload/paste that file back on `/saved` to import.

The import endpoint walks the payload for both Threads post data (`collectPostsFromData`
in `lib/parse.ts`) and X tweet data (`collectXPostsFromData` in `lib/x.ts`) — the two
schemas don't overlap — normalizes to `Post`, and stores it deduped by `platform:id`,
spanning many authors, in `data/bookmarks.json` (`lib/bookmarkStore.ts`,
`app/api/bookmarks`). In-feed posts also have a **save button** that bookmarks a single
post straight into this feed (`app/api/bookmarks/item`). Because capture reads live API
responses rather than a hard-coded GraphQL id, it survives the sites' internal-id churn;
the fragile part is the page/response structure the extension reads.

## AI feed summary (`/` → "✨ Summarize feed")

The home feed has a one-click AI summary that reads the current tab's posts and returns
a TL;DR plus grouped topics (in the feed's dominant language). It's built on a small
**provider abstraction** so backends are swappable:

- `lib/ai/types.ts` — the `Summarizer` interface (`summarize(feedText) → string`).
- `lib/ai/claude.ts` — Anthropic Claude via the official `@anthropic-ai/sdk`
  (`claude-opus-4-8`, system prompt prompt-cached).
- `lib/ai/gemini.ts` — Google Gemini via REST (`gemini-2.5-flash`, thinking disabled).
- `lib/ai/index.ts` — `getSummarizer(provider)` + `availableProviders()`.
- `app/api/summarize` — `GET` lists configured providers; `POST {provider?, platform?,
  source?}` returns the summary. `components/FeedSummary.tsx` is the UI.

Set whichever API keys you have (in `.env.local`); only configured providers appear in
the UI, and the picker shows when both are set:

    ANTHROPIC_API_KEY=sk-ant-...      # enables Claude
    GEMINI_API_KEY=AIza...            # enables Gemini
    AI_PROVIDER=claude                # default when none is passed (claude | gemini)
    # GEMINI_MODEL=gemini-2.5-flash   # optional override

Feed text is sent to the chosen provider's API when you click summarize — nothing is
sent otherwise. Adding a third provider is one new file implementing `Summarizer` plus
an arm in `getSummarizer`.

## Post tags + tag search

Every post on every feed (home, per-account, saved, search) can carry **multiple tags**.
Tags are stored **outside** the post objects — keyed by `platform:id` in
`data/postTags.json` — because `postStore` overwrites posts on each crawl; an inline tag
would be lost. So tags survive re-crawls and are shared wherever the post appears.

- **Tag a post:** each card shows a quiet **🏷 Tag** affordance; add as many tags as you
  like. Tags render as `#chips` (click → tag search, × → remove).
- **Search by tag:** click any `#chip`, type `#tag` in the search box, or pick from the
  tag bar on `/search` (each tag shows its post count). `/search?tag=foo` lists every
  post tagged `foo` across the archive.
- **Filter a feed by tag:** every feed — **home**, **Saved**, **per-account**
  (`/@user`, `/x/user`), and the manage saved-posts view — shows a *Filter by tag* bar
  (`components/PostTagFilter.tsx`). Selecting chips narrows the feed via the `ptag` URL
  param — multi-select is AND (posts carrying *all* selected tags). It composes with the
  platform tab and account-tag/VIP filters. Per-account bars scope to only the tags
  present on that account (`tagsForPosts`). Search uses tag **search** (one tag, whole
  archive); the feed bar is multi-tag **filtering** of what's already in view.

Pieces: `lib/postTagStore.ts` (storage + `getTagMap` / `keysWithTag` / `tagCounts`),
`app/api/posts/tags` (add/remove), `components/PostTags.tsx` (per-card editor). The tag
map is threaded through `Feed`/`InfiniteFeed` → `PostCard` like the bookmark state.
(Distinct from **account** tags in `/manage`, which group accounts for the home filter.)

## Configure accounts

The initial account list lives in `config/accounts.ts` (used to seed the store).
After first run, manage accounts from `/manage`. Visit `/@<username>` for any single
public account.

## Knowledge base (datafy → connect → find → use)

The feed is the *capture* layer; these turn the archive into knowledge. All of it works
**with no API key** (a local fallback embedder + heuristic enricher), and gets richer when
`GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`) is set.

- **Datafy — `Enrich archive` on `/manage`** (`lib/pipeline.ts`, `app/api/enrich`). Decoupled
  from crawl on purpose (crawl stays a fast sync save). For each post it stores, *outside* the
  post (keyed by `platform:id`, surviving re-crawls): a `summary`, normalized `topics`, named
  `entities`, a content `type`, `lang`, and a `keepScore`. Provider extraction reuses the
  existing `Summarizer` with a JSON prompt (`lib/ai/enrich.ts`); a heuristic `localEnricher`
  runs with no key. Records carry a `promptVersion` so a changed prompt only re-enriches stale
  rows. Runs in bounded, resumable batches with per-item retry/backoff — a transient rate-limit
  drops nothing (failed items stay pending). Stores: `lib/enrichmentStore.ts`.
- **Embeddings + semantic search** (`lib/ai/embed.ts`, `lib/embeddingStore.ts`,
  `lib/semanticSearch.ts`). Each post gets an L2-normalized vector (Gemini
  `gemini-embedding-001`, or a deterministic feature-hashing local embedder with CJK bigrams
  so Korean works offline). `/search` shows exact keyword hits **plus** a "Related by meaning"
  section — recall beyond literal matches. Each vector records the embedder `id`; vectors from
  different backends are never mixed.
- **Connect** — every post card has a lazy **Related** panel (`/api/related`, pure vector, no
  AI call) and **`/topics`** is an auto-generated hub of extracted topics → every post about
  one. (Distinct from manual `#tags`.)
- **Triage — `/inbox`** (`lib/captureStateStore.ts`, `/api/posts/state`). The core use-loop the
  archive was missing: new captures default to `inbox`; per-card **Keep / Archive / Discard**
  promotes signal out of the noise. State lives outside the post and survives re-crawls.
- **Use — Ask-my-archive (`/ask`)** (`app/api/ask`). A question → top-k semantic retrieval →
  a synthesized answer that cites only your own posts (`[n]` → source links). With no key, or
  if synthesis is rate-limited, it gracefully returns the retrieved sources so the question is
  never a dead end.

Pipeline order is enrich-then-embed, save-after-success, so a partial run is always safe.
`npm test` covers the vector math, stores, enricher parsing/retry, and semantic ranking.

## Collections, synthesis & export (capture → create)

Beyond retrieving knowledge, you can *produce* from it.

- **Collections** (`/collections`, `lib/collectionStore.ts`) — bundle posts into a project or
  reading list. Each post card has a **Collect** button (`components/AddToCollection.tsx`) to add
  to one or many collections (with inline create). Collections store an ordered list of
  `platform:id` keys plus a saved synthesis note.
- **Synthesis** (`/collections/[id]` → ✨ Synthesize, `app/api/collections/synthesize`) — the AI
  reads the collection's posts and writes ONE coherent Markdown note (overview + grouped themes),
  which is **saved** on the collection (not ephemeral). Reuses the `Summarizer` abstraction.
- **Export** (`app/api/collections/export`, `lib/export.ts`) — download a collection as
  **Markdown** or **Obsidian** (topics/tags as `[[wikilinks]]`), including the synthesis note and
  per-post body, tags, date, and original link. Filenames are RFC-5987 encoded so non-ASCII
  (e.g. Korean) collection names download correctly.

## Editable AI topics (human-in-the-loop)

AI-extracted `topics` aren't final. Every card shows them as small chips (distinct from manual
`#tags`) with **× to remove** and **+ topic** to add (`components/PostTopics.tsx`,
`app/api/posts/enrichment`). An edited enrichment record is marked `edited`, and the pipeline's
`freshKeys` treats edited rows as fresh — so manual corrections **survive re-enrichment** instead
of being overwritten. Topics drive `/topics` and feed into the connection layer.

## Topic & entity hubs, stats, media archiving (P2)

- **Entities (`/entities`)** — the tools / people / companies / concepts the AI extracted,
  each linking to every post that mentions it (`entityCounts` / `keysWithEntity`). A second
  connection axis beside topics. The **topic hub** (`/topics`) also shows **related topics** —
  ones that co-occur in the same posts (`relatedTopics`).
- **Stats (`/stats`)** — the north-star dashboard: coverage (how much of the archive is
  enriched/embedded), the signal ratio (share of posts scoring ≥ 0.5 worth-keeping), the triage
  breakdown, content-type mix, and top topics/entities. `lib/stats.ts` splits a pure
  `computeStats` (unit-tested) from the store-backed page.
- **Media archiving (`ARCHIVE_MEDIA=1`)** — opt-in. At crawl time (the only window before the
  CDN's signed URLs expire), images/videos are downloaded to `data/media/` and the stored post
  points at a local serving route (`/api/media?f=…`), so the archive doesn't rot. SSRF-guarded
  to known CDNs, size-capped (10 MB image / 80 MB video), content-addressed by URL hash, and
  fully best-effort — any failure falls back to the original hotlink and never breaks a crawl.
  `lib/mediaArchive.ts`, served by `app/api/media`.

## 3D knowledge graph (`/graph`)

The visual peak of the connection layer: a **WebGL 3D force-directed graph**
(`react-force-graph-3d` / Three.js, `components/Graph3D.tsx`) of how the archive's concepts
relate. Toggle the two axes with the **토픽 / 엔티티** tabs (`?view=entities`).

**Topics vs entities** — the two ways the archive is indexed:

- **Topic** — what a post is *about*: an abstract subject label the AI extracts, e.g.
  `ai literacy`, `korean market`. Drives `/topics`.
- **Entity** — a concrete *named thing mentioned* in a post, classified into four types —
  **tool**, **person**, **company**, **concept** (e.g. `Roman Space Telescope`, `Bill Nelson`,
  `NASA`, `Chief of Staff`). Drives `/entities`.

  So one post *about* space exploration (topic) might *mention* `NASA` (company), `Bill Nelson`
  (person) and `Roman Space Telescope` (tool) — those are its entities.

**How to read the graph:**

- **Node size** = post count — how often that topic/entity appears in the archive.
- **Colour** = category. In **topic** view it's an auto-detected **cluster** (community, via
  label propagation); in **entity** view it's the **type** (🟡 company · 🔵 tool · 🟢 person ·
  🟣 concept) — see the legend.
- **Link (edge)** = **co-occurrence**: two nodes are linked when they appear in the *same
  post(s)*; thicker = more shared posts.
- **Distance** = the force layout's equilibrium — connected nodes attract, unconnected ones
  repel — so a tight clump ≈ strongly related, far apart ≈ unrelated. Read the *topology*
  (what's linked, what clusters), not exact pixel distances. The layout is deterministic, so
  the same data lays out the same way each time.

**Interaction:** each cluster is wrapped in a clickable translucent **fog** region — click
anywhere inside it (no need to hit a tiny node sphere) to fly the camera in and focus that
cluster; its internal links stay bright while the rest dim. **Back out** with the browser Back
button, Esc, an empty-space click, or the floating **← 전체 보기** pill. Inside a focused
cluster, clicking a node opens a **feed popup** (`components/NodePostsPopup.tsx` +
`/api/node-posts`) that previews that node's posts — each linking to its **source original**,
plus a link to the full hub feed. A starfield, depth fog, and planet-style node shading give
the scene its 3D depth cues.

## Topic merge & deletion preservation (P3)

- **Topic merge** — on a topic hub, **⤳ Merge** folds the topic into another archive-wide
  (`mergeTopic`), deduping and marking records `edited` so the merge survives re-enrichment.
  Human-in-the-loop cleanup of the auto-extracted vocabulary (e.g. fold “ai assistants” → “ai agents”).
- **Deletion preservation** — each crawl reconciles stored vs. returned post ids
  (`lib/preservedStore.ts`): a post you had that the source no longer returns is marked
  **📦 preserved** (a badge on the card), and un-marked if it reappears. A post deleted at the
  source isn't lost — that's the archive's whole point.

## Backup/restore & timeline (P4)

- **Backup & restore (`/manage` → Backup panel, `app/api/backup`, `lib/backup.ts`)** — the
  archive is the product, so it's portable and recoverable. **Download** bundles every data file
  (per-account posts + enrichment, embeddings, tags, notes, collections, triage, preserved,
  bookmarks, accounts) into one JSON. **Restore** writes them back — path-guarded to known files
  and `posts/<safe>.json` only (no traversal), version-checked, and it rejects non-backup files.
- **Timeline (`/timeline`, `lib/timeline.ts`)** — the time axis: a per-day activity strip, an
  **On this day** section (posts from earlier years sharing today's month-day), and a
  day-sectioned feed with sticky date headers. Pure, UTC-based, unit-tested helpers.

## Digest & onboarding (P5)

- **Digest (`/digest`, `lib/digest.ts`, `app/api/digest`)** — the review ritual: pick a window
  (7 / 14 / 30 days), see quick stats (count, accounts, platform split, top authors), and generate
  a one-click AI **“week in review”** (headline + grouped themes), plus the windowed feed. Pure
  window/stats helpers are unit-tested; the AI step degrades gracefully without a key.
- **Onboarding (`components/GettingStarted.tsx`)** — a brand-new (empty) archive shows a four-step
  getting-started guide (add & crawl → enrich → connect → use) instead of an empty feed, so the
  core loop is obvious on first run.
