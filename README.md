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
    npm run dev      # http://localhost:3000
    npm test         # vitest
    npm run build

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

## Configure accounts

The initial account list lives in `config/accounts.ts` (used to seed the store).
After first run, manage accounts from `/manage`. Visit `/@<username>` for any single
public account.
