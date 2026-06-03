import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ACCOUNTS } from '@/config/accounts';

// File-backed store for the managed account list and each account's last crawl
// result. No database — a single JSON file, seeded from config/accounts.ts on first
// read. Server-only (uses node:fs). The data directory is overridable via
// ACCOUNTS_DATA_DIR (used by tests).

export type CrawlStatus = 'ok' | 'private' | 'not_found' | 'blocked' | 'parse_error';

export interface AccountEntry {
  username: string;
  enabled: boolean;
  lastStatus?: CrawlStatus;
  lastCount?: number;
  lastCrawledAt?: number; // unix milliseconds
}

function dataFile(): string {
  const dir = process.env.ACCOUNTS_DATA_DIR ?? join(process.cwd(), 'data');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'accounts.json');
}

function normalize(username: string): string {
  return username.trim().replace(/^@+/, '').toLowerCase();
}

function seed(): AccountEntry[] {
  return ACCOUNTS.map((username) => ({ username: normalize(username), enabled: true }));
}

export function getAccounts(): AccountEntry[] {
  const file = dataFile();
  if (!existsSync(file)) {
    const seeded = seed();
    writeFileSync(file, JSON.stringify(seeded, null, 2));
    return seeded;
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as AccountEntry[];
  } catch {
    return seed();
  }
}

function save(list: AccountEntry[]): void {
  writeFileSync(dataFile(), JSON.stringify(list, null, 2));
}

export function addAccount(username: string): AccountEntry[] {
  const handle = normalize(username);
  const list = getAccounts();
  if (handle && !list.some((a) => a.username === handle)) {
    list.push({ username: handle, enabled: true });
    save(list);
  }
  return list;
}

export function removeAccount(username: string): AccountEntry[] {
  const handle = normalize(username);
  const list = getAccounts().filter((a) => a.username !== handle);
  save(list);
  return list;
}

export function setEnabled(username: string, enabled: boolean): AccountEntry[] {
  const handle = normalize(username);
  const list = getAccounts().map((a) => (a.username === handle ? { ...a, enabled } : a));
  save(list);
  return list;
}

export function recordCrawl(
  username: string,
  status: CrawlStatus,
  count: number,
  when: number,
): AccountEntry[] {
  const handle = normalize(username);
  const list = getAccounts().map((a) =>
    a.username === handle ? { ...a, lastStatus: status, lastCount: count, lastCrawledAt: when } : a,
  );
  save(list);
  return list;
}

export function enabledUsernames(): string[] {
  return getAccounts()
    .filter((a) => a.enabled)
    .map((a) => a.username);
}
