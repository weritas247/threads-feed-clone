import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reconcilePreservation, isPreserved, getPreservedKeys } from './preservedStore';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pres-'));
  process.env.ACCOUNTS_DATA_DIR = dir;
});
afterEach(() => {
  delete process.env.ACCOUNTS_DATA_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe('reconcilePreservation', () => {
  it('marks stored-but-missing posts as preserved', () => {
    const res = reconcilePreservation('threads', ['1', '2', '3'], ['1', '3']);
    expect(res.newlyPreserved).toBe(1);
    expect(isPreserved('threads', '2')).toBe(true);
    expect(isPreserved('threads', '1')).toBe(false);
  });

  it('un-marks a post that reappears in a later crawl', () => {
    reconcilePreservation('threads', ['1', '2'], ['1']); // 2 vanishes
    expect(isPreserved('threads', '2')).toBe(true);
    reconcilePreservation('threads', ['1', '2'], ['1', '2']); // 2 returns
    expect(isPreserved('threads', '2')).toBe(false);
  });

  it('does not double-count an already-preserved post', () => {
    reconcilePreservation('threads', ['1', '2'], ['1']);
    const res = reconcilePreservation('threads', ['1', '2'], ['1']);
    expect(res.newlyPreserved).toBe(0);
    expect(getPreservedKeys().size).toBe(1);
  });

  it('keys are platform-scoped', () => {
    reconcilePreservation('x', ['1'], []); // x:1 gone
    expect(isPreserved('x', '1')).toBe(true);
    expect(isPreserved('threads', '1')).toBe(false);
  });
});
