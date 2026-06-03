# Threads Feed Clone — Design

- Date: 2026-06-04
- Status: Approved (pending implementation)

## Purpose

Fetch public Threads accounts' data and render their **feed** with a UI identical
to the real Threads UI. Two views: an aggregated home feed across a configured list
of accounts, and a per-account feed chosen via URL. Theme supports both dark and
light with a toggle.

## Scope

- **In scope:**
  - **Aggregated home feed** (`/`): posts from a configured list of accounts, merged
    and sorted newest-first (like a following feed).
  - **Per-account feed** (`/[username]`): a single account's posts; reachable by clicking
    an author in the aggregated feed.
- **Out of scope:** Login, posting, profile/about tabs, search, notifications, DMs,
  official OAuth API (left as a future swap behind the normalization layer).

## Configured Accounts

The aggregated feed reads from a config list (`config/accounts.ts`) of usernames.
Initial list (AI-related accounts):

`autogod.ai`, `ai.yeongseon`, `manus`, `gptaku_ai`, `reels_code_official`,
`ai_tusol`, `fast.ports.ai`, `promppy_com`, `hyle.ai.kr`, `crealwork`,
`algovaultai`, `anelo_tech`, `mceo.atm`, `yoonkwon_ai`, `mapilnyeo`,
`choi.openai`, `glow.aistudio`, `sangwon.ropefree`, `freainer`, `let.s.ai`,
`peebiki`, `aicoffeechat`, `aiowner_`, `codecasper_ai`

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- `next-themes` for dark/light toggle
- Vitest + React Testing Library for tests
- `gh` CLI for GitHub repo creation/push

## Architecture

```
/ (home, server)                    /[username] (server)
   └─ config/accounts.ts               └─ lib/threads.ts (one account)
   └─ fetch each account in parallel    └─ <Feed posts={Post[]} />
      via lib/threads.ts
   └─ merge + sort by createdAt desc
   └─ <Feed posts={Post[]} />

lib/threads.ts  (scraper — the only fragile, swappable unit)
   1) fetch public profile HTML at threads.net/@username → extract user_id
   2) call Threads GraphQL endpoint (doc_id + required headers) for the feed
   3) normalize raw JSON → internal domain types
```

Data flows server → client. The scraper is isolated in one module so that when Meta
changes page/endpoint structure, only `lib/threads.ts` (and its fixtures) need updating.
The UI consumes only the normalized domain types and never touches raw scrape output.

The aggregated home feed fetches each configured account concurrently, tolerates
individual-account failures (skips a failed account rather than failing the whole page),
merges all posts, and sorts newest-first. A per-post `author` link routes to
`/[username]`.

### Why a normalization layer

The UI depends on stable internal types (`Post`, `Author`, `Media`, `Stats`), not on
the scrape shape. This lets us later swap in the official Threads API (option A) without
touching any component.

## Domain Types (normalized)

- `Author`: `{ username, displayName, avatarUrl, verified }`
- `Media`: `{ type: 'image' | 'video', url, width, height, alt? }`
- `Stats`: `{ likes, replies, reposts, shares }`
- `Post`: `{ id, author, text, createdAt, media: Media[], stats: Stats,
  replyPreview?: { avatars: string[], count: number }, chain?: Post[] }`

## UI Components (match Threads exactly)

- `Feed` — renders a list of `PostCard`.
- `PostCard` — avatar, username (+ verified badge), relative time, `…` menu, body text.
- `Media` — single image / carousel / video.
- `ActionBar` — like / reply / repost / share icons with counts.
- `ThreadChain` — connected posts with the left vertical connector line.
- `ReplyFacepile` — "OOO and N others replied" row.
- `ThemeToggle` — top-right dark/light switch.

Visual details (spacing, typography, the vertical thread connector line) are reproduced
in CSS against the real Threads palette.

## Error Handling

- Private / nonexistent account, or broken scrape → explicit, friendly error screen.
- Network/endpoint failure → error state with retry, not a crash.
- The scraper returns a typed result (`Ok<Post[]>` / `Err<reason>`); the route renders
  the matching state.

## Theming

- `next-themes` + CSS variables. Default dark. Toggle persists.
- Color tokens defined from the real Threads dark/light palettes.

## Testing

- **Normalization:** sample raw JSON fixtures → expected `Post[]`. No network in tests.
- **Components:** render `PostCard`/`Feed` from mock domain data (snapshot + key assertions).
- Scraper network call is not unit-tested against live Threads; it is exercised through
  fixtures of captured responses.

## Risks / Notes

- Unofficial scraping: fragile to Meta changes, isolated to `lib/threads.ts`.
- CORS: scraping must run server-side (Next route/server component), never in the browser.

## GitHub

- `git init` → commit → create repo via `gh repo create` → push.
