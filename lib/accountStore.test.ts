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
  enabledUsernames,
} from './accountStore';

beforeEach(() => {
  // Fresh isolated data dir per test so seeding/writes don't leak between tests.
  process.env.ACCOUNTS_DATA_DIR = mkdtempSync(join(tmpdir(), 'accts-'));
});

describe('accountStore', () => {
  it('seeds from config on first read with all enabled', () => {
    const list = getAccounts();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((a) => a.enabled)).toBe(true);
  });

  it('adds a new account (normalized, @-stripped, lowercased) without duplicates', () => {
    const before = getAccounts().length;
    addAccount('@New_Account');
    addAccount('new_account'); // duplicate after normalization
    const list = getAccounts();
    expect(list.length).toBe(before + 1);
    expect(list.some((a) => a.username === 'new_account')).toBe(true);
  });

  it('removes an account', () => {
    addAccount('temp_acct');
    removeAccount('temp_acct');
    expect(getAccounts().some((a) => a.username === 'temp_acct')).toBe(false);
  });

  it('toggles enabled and reflects it in enabledUsernames', () => {
    addAccount('toggle_me');
    setEnabled('toggle_me', false);
    expect(getAccounts().find((a) => a.username === 'toggle_me')?.enabled).toBe(false);
    expect(enabledUsernames()).not.toContain('toggle_me');
  });

  it('records a crawl result (incl. avatar) on the matching account', () => {
    addAccount('crawled');
    recordCrawl('crawled', 'ok', 7, 1700000000000, 'https://cdn/a.jpg');
    const a = getAccounts().find((x) => x.username === 'crawled');
    expect(a?.lastStatus).toBe('ok');
    expect(a?.lastCount).toBe(7);
    expect(a?.lastCrawledAt).toBe(1700000000000);
    expect(a?.avatarUrl).toBe('https://cdn/a.jpg');
  });

  it('preserves a previously stored avatar when a later crawl omits it', () => {
    addAccount('keepav');
    recordCrawl('keepav', 'ok', 1, 1, 'https://cdn/keep.jpg');
    recordCrawl('keepav', 'blocked', 0, 2); // no avatar this time
    expect(getAccounts().find((x) => x.username === 'keepav')?.avatarUrl).toBe('https://cdn/keep.jpg');
  });

  it('sets an avatar without a crawl and tracks which accounts still lack one', () => {
    addAccount('avtest');
    expect(accountsMissingAvatar()).toContain('avtest');
    setAvatar('avtest', 'https://cdn/av.jpg');
    expect(getAccounts().find((x) => x.username === 'avtest')?.avatarUrl).toBe('https://cdn/av.jpg');
    expect(accountsMissingAvatar()).not.toContain('avtest');
  });
});
