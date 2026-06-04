import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getNote, setNote, getNoteMap } from './postNoteStore';

beforeEach(() => {
  process.env.ACCOUNTS_DATA_DIR = mkdtempSync(join(tmpdir(), 'postnotes-'));
});

describe('postNoteStore', () => {
  it('returns empty for a post with no note', () => {
    expect(getNote('threads', '1')).toBe('');
    expect(getNoteMap()).toEqual({});
  });

  it('saves a trimmed note and reads it back, keyed by platform:id', () => {
    expect(setNote('threads', '1', '  read later  ')).toBe('read later');
    expect(getNote('threads', '1')).toBe('read later');
    expect(getNoteMap()).toEqual({ 'threads:1': 'read later' });
  });

  it('same id on different platforms is distinct', () => {
    setNote('threads', '1', 'a');
    setNote('x', '1', 'b');
    expect(getNote('threads', '1')).toBe('a');
    expect(getNote('x', '1')).toBe('b');
  });

  it('blank note clears the entry', () => {
    setNote('threads', '1', 'temp');
    expect(setNote('threads', '1', '   ')).toBe('');
    expect(getNoteMap()).toEqual({});
  });
});
