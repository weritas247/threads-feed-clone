# Threads Feed Clone — Design

- Date: 2026-06-04
- Status: Approved (pending implementation)

## Purpose

Fetch a public Threads account's data and render its **feed** with a UI identical
to the real Threads UI. Account is chosen via URL. Theme supports both dark and
light with a toggle.

## Scope

- **In scope:** Feed rendering only, for a single public account at a time.
- **Out of scope:** Login, posting, profile/about tabs, search beyond URL, notifications,
  DMs, official OAuth API (left as a future swap behind the normalization layer).

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- `next-themes` for dark/light toggle
- Vitest + React Testing Library for tests
- `gh` CLI for GitHub repo creation/push

## Architecture

```
/[username] (server component / route)
   └─ lib/threads.ts  (scraper — the only fragile, swappable unit)
        1) fetch public profile HTML at threads.net/@username → extract user_id
        2) call Threads GraphQL endpoint (doc_id + required headers) for the feed
        3) normalize raw JSON → internal domain types
   └─ <Feed posts={Post[]} />  (pure presentation, data-source agnostic)
```

Data flows server → client. The scraper is isolated in one module so that when Meta
changes page/endpoint structure, only `lib/threads.ts` (and its fixtures) need updating.
The UI consumes only the normalized domain types and never touches raw scrape output.

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
