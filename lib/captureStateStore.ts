import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Platform, Post } from './types';

// Triage state for each captured post — the core "use loop" the product was missing:
// new captures land in `inbox`, a quick review promotes them to `kept` or `archived`,
// or drops them to `discarded`. State lives OUTSIDE the post (survives re-crawls),
// keyed by `platform:id` in data/captureState.json. A post with no record is treated
// as `inbox` (unreviewed). Server-only; dir overridable via ACCOUNTS_DATA_DIR.

export type CaptureState = 'inbox' | 'kept' | 'archived' | 'discarded';
export const CAPTURE_STATES: CaptureState[] = ['inbox', 'kept', 'archived', 'discarded'];

type StateMap = Record<string, CaptureState>;

function stateFile(): string {
  const base = process.env.ACCOUNTS_DATA_DIR ?? join(process.cwd(), 'data');
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return join(base, 'captureState.json');
}

const keyOf = (platform: Platform, id: string): string => `${platform}:${id}`;

export function getStateMap(): StateMap {
  const file = stateFile();
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as StateMap;
  } catch {
    return {};
  }
}

function save(map: StateMap): void {
  writeFileSync(stateFile(), JSON.stringify(map));
}

export function getState(platform: Platform, id: string, map: StateMap = getStateMap()): CaptureState {
  return map[keyOf(platform, id)] ?? 'inbox';
}

// Set a post's triage state. Setting back to `inbox` clears the record (inbox is the
// implicit default), keeping the file small.
export function setState(platform: Platform, id: string, state: CaptureState): CaptureState {
  const s = CAPTURE_STATES.includes(state) ? state : 'inbox';
  const map = getStateMap();
  const k = keyOf(platform, id);
  if (s === 'inbox') delete map[k];
  else map[k] = s;
  save(map);
  return s;
}

// Count of posts in each state, given the full known post set (so `inbox` counts the
// implicit-default posts that have no record yet).
export function stateCounts(posts: Post[]): Record<CaptureState, number> {
  const map = getStateMap();
  const out: Record<CaptureState, number> = { inbox: 0, kept: 0, archived: 0, discarded: 0 };
  for (const p of posts) out[getState(p.platform, p.id, map)]++;
  return out;
}

// Keep only posts in the given state. `inbox` includes posts with no record.
export function filterByState(posts: Post[], state: CaptureState): Post[] {
  const map = getStateMap();
  return posts.filter((p) => getState(p.platform, p.id, map) === state);
}
