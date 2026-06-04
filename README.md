# Social Feed Clone (Threads + X)

A Next.js app that scrapes public **Threads** and **X (Twitter)** accounts and
renders their feed with a Threads-identical UI: an aggregated home feed across a
configured account list, plus per-account views, with a dark/light theme toggle.

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
