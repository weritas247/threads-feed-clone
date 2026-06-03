# Threads Feed Clone

A Next.js app that scrapes public Threads accounts and renders their feed with a
Threads-identical UI: an aggregated home feed across a configured account list,
plus a per-account view, with a dark/light theme toggle.

## How it works

`lib/threads.ts` fetches `https://www.threads.com/@<username>` server-side with
browser-like headers, and `lib/parse.ts` extracts post data from the embedded
`<script type="application/json">` blocks, normalizing to the domain types in
`lib/types.ts`. The scraper is the only source-specific module — the UI consumes
only normalized `Post` objects, so the data source can be swapped without touching
any component.

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

## Configure accounts

Edit `config/accounts.ts` to change which accounts appear in the aggregated feed.
Visit `/@<username>` for any single public account.
