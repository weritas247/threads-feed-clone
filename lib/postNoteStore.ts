import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Platform } from './types';

// File-backed per-POST notes (free-text memos). Like post tags, these live OUTSIDE the
// post objects (postStore overwrites posts on crawl), keyed by `platform:id` in
// data/postNotes.json, so a memo survives re-crawls and follows the post across feeds.
// Server-only. Dir overridable via ACCOUNTS_DATA_DIR.

type NoteMap = Record<string, string>;

function notesFile(): string {
  const base = process.env.ACCOUNTS_DATA_DIR ?? join(process.cwd(), 'data');
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return join(base, 'postNotes.json');
}

const keyOf = (platform: Platform, id: string): string => `${platform}:${id}`;

export function getNoteMap(): NoteMap {
  const file = notesFile();
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as NoteMap;
  } catch {
    return {};
  }
}

function save(map: NoteMap): void {
  writeFileSync(notesFile(), JSON.stringify(map));
}

export function getNote(platform: Platform, id: string): string {
  return getNoteMap()[keyOf(platform, id)] ?? '';
}

// Set (or clear, when blank) the memo for one post. Returns the stored note ('' if cleared).
export function setNote(platform: Platform, id: string, note: string): string {
  const text = (note ?? '').trim();
  const map = getNoteMap();
  const k = keyOf(platform, id);
  if (text) map[k] = text;
  else delete map[k];
  save(map);
  return text;
}
