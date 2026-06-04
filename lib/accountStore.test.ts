import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getAccounts,
  addAccount,
  removeAccount,
  setEnabled,
  recordCrawl,
  setAvatar,
  accountsMissingAvatar,
  enabledAccounts,
  addTag,
  removeTag,
  allTags,
  accountsWithTag,
  setVip,
  vipAccounts,
} from './accountStore';

beforeEach(() => {
  // Fresh isolated data dir per test so seeding/writes don't leak between tests.
  process.env.ACCOUNTS_DATA_DIR = mkdtempSync(join(tmpdir(), 'accts-'));
});

describe('accountStore', () => {
  it('seeds from config on first read with all enabled threads accounts', () => {
    const list = getAccounts();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((a) => a.enabled)).toBe(true);
    expect(list.every((a) => a.platform === 'threads')).toBe(true);
  });

  it('adds a new account (normalized) without duplicates', () => {
    const before = getAccounts().length;
    addAccount('@New_Account', 'threads');
    addAccount('new_account', 'threads'); // duplicate after normalization
    const list = getAccounts();
    expect(list.length).toBe(before + 1);
    expect(list.some((a) => a.username === 'new_account')).toBe(true);
  });

  it('treats the same handle on different platforms as distinct accounts', () => {
    addAccount('nasa', 'threads');
    addAccount('nasa', 'x');
    const nasas = getAccounts().filter((a) => a.username === 'nasa');
    expect(nasas.map((a) => a.platform).sort()).toEqual(['threads', 'x']);
  });

  it('removes only the matching (username, platform)', () => {
    addAccount('dup', 'threads');
    addAccount('dup', 'x');
    removeAccount('dup', 'threads');
    const left = getAccounts().filter((a) => a.username === 'dup');
    expect(left.map((a) => a.platform)).toEqual(['x']);
  });

  it('toggles enabled and reflects it in enabledAccounts', () => {
    addAccount('toggle_me', 'x');
    setEnabled('toggle_me', 'x', false);
    expect(getAccounts().find((a) => a.username === 'toggle_me')?.enabled).toBe(false);
    expect(enabledAccounts().some((a) => a.username === 'toggle_me')).toBe(false);
  });

  it('records a crawl result (incl. avatar) on the matching account', () => {
    addAccount('crawled', 'x');
    recordCrawl('crawled', 'x', 'ok', 7, 1700000000000, 'https://cdn/a.jpg');
    const a = getAccounts().find((x) => x.username === 'crawled' && x.platform === 'x');
    expect(a?.lastStatus).toBe('ok');
    expect(a?.lastCount).toBe(7);
    expect(a?.lastCrawledAt).toBe(1700000000000);
    expect(a?.avatarUrl).toBe('https://cdn/a.jpg');
  });

  it('preserves a previously stored avatar when a later crawl omits it', () => {
    addAccount('keepav', 'threads');
    recordCrawl('keepav', 'threads', 'ok', 1, 1, 'https://cdn/keep.jpg');
    recordCrawl('keepav', 'threads', 'blocked', 0, 2); // no avatar this time
    expect(getAccounts().find((x) => x.username === 'keepav')?.avatarUrl).toBe('https://cdn/keep.jpg');
  });

  it('sets an avatar without a crawl and tracks which accounts still lack one', () => {
    addAccount('avtest', 'threads');
    expect(accountsMissingAvatar().some((a) => a.username === 'avtest')).toBe(true);
    setAvatar('avtest', 'threads', 'https://cdn/av.jpg');
    expect(getAccounts().find((x) => x.username === 'avtest')?.avatarUrl).toBe('https://cdn/av.jpg');
    expect(accountsMissingAvatar().some((a) => a.username === 'avtest')).toBe(false);
  });

  it('adds/removes multi tags (normalized, deduped) and lists them', () => {
    addAccount('tagme', 'threads');
    addTag('tagme', 'threads', 'AI');
    addTag('tagme', 'threads', 'ai'); // duplicate after normalization
    addTag('tagme', 'threads', '금융');
    const a = getAccounts().find((x) => x.username === 'tagme');
    expect(a?.tags.sort()).toEqual(['ai', '금융'].sort());
    expect(allTags()).toContain('ai');
    expect(accountsWithTag('금융').some((r) => r.username === 'tagme')).toBe(true);
    removeTag('tagme', 'threads', 'ai');
    expect(getAccounts().find((x) => x.username === 'tagme')?.tags).toEqual(['금융']);
  });

  it('tags are scoped per (username, platform)', () => {
    addAccount('dup', 'threads');
    addAccount('dup', 'x');
    addTag('dup', 'x', 'vipnews');
    expect(getAccounts().find((a) => a.username === 'dup' && a.platform === 'threads')?.tags).toEqual([]);
    expect(getAccounts().find((a) => a.username === 'dup' && a.platform === 'x')?.tags).toEqual(['vipnews']);
  });

  it('toggles VIP and lists VIP accounts', () => {
    addAccount('star', 'x');
    expect(getAccounts().find((a) => a.username === 'star')?.vip).toBe(false);
    setVip('star', 'x', true);
    expect(getAccounts().find((a) => a.username === 'star')?.vip).toBe(true);
    expect(vipAccounts().some((r) => r.username === 'star' && r.platform === 'x')).toBe(true);
    setVip('star', 'x', false);
    expect(vipAccounts().some((r) => r.username === 'star')).toBe(false);
  });
});
