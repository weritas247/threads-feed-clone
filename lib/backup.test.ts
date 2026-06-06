import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBackup, restoreBackup, isBackup, isSafeBackupPath } from './backup';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'bak-'));
  process.env.ACCOUNTS_DATA_DIR = dir;
});
afterEach(() => {
  delete process.env.ACCOUNTS_DATA_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe('createBackup / restoreBackup', () => {
  it('round-trips flat stores and per-account posts', () => {
    writeFileSync(join(dir, 'enrichment.json'), JSON.stringify({ 'threads:1': { topics: ['ai'] } }));
    writeFileSync(join(dir, 'collections.json'), JSON.stringify({ c1: { name: 'x' } }));
    mkdirSync(join(dir, 'posts'));
    writeFileSync(join(dir, 'posts', 'threads_u.json'), JSON.stringify([{ id: '1' }]));

    const backup = createBackup(1000);
    expect(backup.version).toBe(1);
    expect(backup.createdAt).toBe(1000);
    expect(Object.keys(backup.files).sort()).toEqual(['collections.json', 'enrichment.json', 'posts/threads_u.json']);

    // Wipe and restore into a fresh dir.
    const dir2 = mkdtempSync(join(tmpdir(), 'bak2-'));
    process.env.ACCOUNTS_DATA_DIR = dir2;
    const { restored } = restoreBackup(backup);
    expect(restored).toBe(3);
    expect(JSON.parse(readFileSync(join(dir2, 'enrichment.json'), 'utf8'))).toEqual({ 'threads:1': { topics: ['ai'] } });
    expect(existsSync(join(dir2, 'posts', 'threads_u.json'))).toBe(true);
    rmSync(dir2, { recursive: true, force: true });
  });

  it('skips missing files without error', () => {
    const backup = createBackup(1);
    expect(backup.files).toEqual({});
  });
});

describe('isBackup', () => {
  it('accepts a valid bundle and rejects junk', () => {
    expect(isBackup({ version: 1, files: {} })).toBe(true);
    expect(isBackup({ version: 99, files: {} })).toBe(false);
    expect(isBackup(null)).toBe(false);
    expect(isBackup({ files: {} })).toBe(false);
  });
});

describe('isSafeBackupPath', () => {
  it('allows known flat files and posts/<safe>.json, rejects traversal', () => {
    expect(isSafeBackupPath('enrichment.json')).toBe(true);
    expect(isSafeBackupPath('posts/threads_u.json')).toBe(true);
    expect(isSafeBackupPath('posts/../../etc/passwd')).toBe(false);
    expect(isSafeBackupPath('secrets.json')).toBe(false);
  });
});
