import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Whole-knowledge-base backup & restore. The archive IS the product, so it must be
// portable and recoverable. A backup is one JSON bundle of every data file (the flat
// stores + the per-account posts dir). Restore writes them all back. Server-only.

const BACKUP_VERSION = 1;

// Flat top-level store files (relative to the data dir).
const FLAT_FILES = [
  'accounts.json',
  'bookmarks.json',
  'enrichment.json',
  'embeddings.json',
  'postTags.json',
  'postNotes.json',
  'collections.json',
  'captureState.json',
  'preserved.json',
];

export interface Backup {
  version: number;
  createdAt: number;
  files: Record<string, unknown>; // path (relative to data dir) → parsed JSON
}

function dataDir(): string {
  const base = process.env.ACCOUNTS_DATA_DIR ?? join(process.cwd(), 'data');
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return base;
}

function readJson(path: string): unknown | undefined {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}

// Gather every data file into one bundle. `createdAt` is passed in (callers stamp it) so
// this stays deterministic/testable. Missing files are simply skipped.
export function createBackup(createdAt: number): Backup {
  const base = dataDir();
  const files: Record<string, unknown> = {};

  for (const f of FLAT_FILES) {
    const data = readJson(join(base, f));
    if (data !== undefined) files[f] = data;
  }

  // Per-account post files under posts/.
  const postsDir = join(base, 'posts');
  if (existsSync(postsDir)) {
    for (const f of readdirSync(postsDir).filter((n) => n.endsWith('.json'))) {
      const data = readJson(join(postsDir, f));
      if (data !== undefined) files[`posts/${f}`] = data;
    }
  }

  return { version: BACKUP_VERSION, createdAt, files };
}

// Validate a parsed object is a backup we can restore.
export function isBackup(obj: unknown): obj is Backup {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return o.version === BACKUP_VERSION && typeof o.files === 'object' && o.files !== null;
}

// Restore a bundle: write each file back under the data dir. Only allows known flat files
// and posts/<safe>.json paths (no traversal). Returns how many files were written.
export function restoreBackup(backup: Backup): { restored: number } {
  const base = dataDir();
  let restored = 0;
  for (const [path, data] of Object.entries(backup.files)) {
    if (!isSafeBackupPath(path)) continue;
    const full = join(base, path);
    const dir = join(full, '..');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(full, JSON.stringify(data));
    restored++;
  }
  return { restored };
}

export function isSafeBackupPath(path: string): boolean {
  if (FLAT_FILES.includes(path)) return true;
  // posts/<filename>.json with a safe stem only.
  const m = path.match(/^posts\/([a-z0-9._-]+)\.json$/i);
  return Boolean(m);
}
