import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Platform } from './types';
import { ACCOUNTS } from '@/config/accounts';

// File-backed store for the managed account list and each account's last crawl
// result. Accounts are identified by (platform, username), so the same handle can
// exist on both Threads and X. No database — a single JSON file, seeded from
// config/accounts.ts on first read. Server-only. Data dir overridable via
// ACCOUNTS_DATA_DIR (used by tests).

export type CrawlStatus = 'ok' | 'private' | 'not_found' | 'blocked' | 'parse_error';

export interface AccountRef {
  username: string;
  platform: Platform;
}

export interface AccountEntry extends AccountRef {
  enabled: boolean;
  vip: boolean;
  tags: string[];
  avatarUrl?: string;
  lastStatus?: CrawlStatus;
  lastCount?: number;
  lastCrawledAt?: number; // unix milliseconds
}

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function dataFile(): string {
  const dir = process.env.ACCOUNTS_DATA_DIR ?? join(process.cwd(), 'data');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'accounts.json');
}

function normalize(username: string): string {
  return username.trim().replace(/^@+/, '').toLowerCase();
}

function same(a: AccountEntry, username: string, platform: Platform): boolean {
  return a.platform === platform && a.username === normalize(username);
}

function seed(): AccountEntry[] {
  return ACCOUNTS.map((username) => ({
    username: normalize(username),
    platform: 'threads' as Platform,
    enabled: true,
    vip: false,
    tags: [],
  }));
}

export function getAccounts(): AccountEntry[] {
  const file = dataFile();
  if (!existsSync(file)) {
    const seeded = seed();
    writeFileSync(file, JSON.stringify(seeded, null, 2));
    return seeded;
  }
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as AccountEntry[];
    // migrate entries written before platform/vip/tags existed
    return raw.map((a) => ({
      ...a,
      platform: a.platform ?? 'threads',
      vip: a.vip ?? false,
      tags: a.tags ?? [],
    }));
  } catch {
    return seed();
  }
}

function save(list: AccountEntry[]): void {
  writeFileSync(dataFile(), JSON.stringify(list, null, 2));
}

export function addAccount(username: string, platform: Platform = 'threads'): AccountEntry[] {
  const handle = normalize(username);
  const list = getAccounts();
  if (handle && !list.some((a) => same(a, handle, platform))) {
    list.push({ username: handle, platform, enabled: true, vip: false, tags: [] });
    save(list);
  }
  return list;
}

export function removeAccount(username: string, platform: Platform): AccountEntry[] {
  const list = getAccounts().filter((a) => !same(a, username, platform));
  save(list);
  return list;
}

export function setEnabled(username: string, platform: Platform, enabled: boolean): AccountEntry[] {
  const list = getAccounts().map((a) => (same(a, username, platform) ? { ...a, enabled } : a));
  save(list);
  return list;
}

export function recordCrawl(
  username: string,
  platform: Platform,
  status: CrawlStatus,
  count: number,
  when: number,
  avatarUrl?: string,
): AccountEntry[] {
  const list = getAccounts().map((a) =>
    same(a, username, platform)
      ? { ...a, lastStatus: status, lastCount: count, lastCrawledAt: when, avatarUrl: avatarUrl ?? a.avatarUrl }
      : a,
  );
  save(list);
  return list;
}

export function setAvatar(username: string, platform: Platform, avatarUrl: string): AccountEntry[] {
  const list = getAccounts().map((a) => (same(a, username, platform) ? { ...a, avatarUrl } : a));
  save(list);
  return list;
}

export function addTag(username: string, platform: Platform, tag: string): AccountEntry[] {
  const tg = normalizeTag(tag);
  if (!tg) return getAccounts();
  const list = getAccounts().map((a) =>
    same(a, username, platform) ? { ...a, tags: [...new Set([...a.tags, tg])] } : a,
  );
  save(list);
  return list;
}

export function removeTag(username: string, platform: Platform, tag: string): AccountEntry[] {
  const tg = normalizeTag(tag);
  const list = getAccounts().map((a) =>
    same(a, username, platform) ? { ...a, tags: a.tags.filter((t) => t !== tg) } : a,
  );
  save(list);
  return list;
}

export function setVip(username: string, platform: Platform, vip: boolean): AccountEntry[] {
  const list = getAccounts().map((a) => (same(a, username, platform) ? { ...a, vip } : a));
  save(list);
  return list;
}

export function vipAccounts(): AccountRef[] {
  return getAccounts()
    .filter((a) => a.vip)
    .map((a) => ({ username: a.username, platform: a.platform }));
}

export function allTags(): string[] {
  return [...new Set(getAccounts().flatMap((a) => a.tags))].sort();
}

export function accountsWithTag(tag: string): AccountRef[] {
  const tg = normalizeTag(tag);
  return getAccounts()
    .filter((a) => a.tags.includes(tg))
    .map((a) => ({ username: a.username, platform: a.platform }));
}

export function accountsMissingAvatar(): AccountRef[] {
  return getAccounts()
    .filter((a) => !a.avatarUrl)
    .map((a) => ({ username: a.username, platform: a.platform }));
}

export function enabledAccounts(): AccountRef[] {
  return getAccounts()
    .filter((a) => a.enabled)
    .map((a) => ({ username: a.username, platform: a.platform }));
}
