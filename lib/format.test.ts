import { describe, it, expect } from 'vitest';
import { formatCount, relativeTime } from './format';

describe('formatCount', () => {
  it('shows small numbers as-is', () => {
    expect(formatCount(0)).toBe('');
    expect(formatCount(42)).toBe('42');
  });
  it('abbreviates thousands and millions', () => {
    expect(formatCount(1200)).toBe('1.2K');
    expect(formatCount(15000)).toBe('15K');
    expect(formatCount(2500000)).toBe('2.5M');
  });
});

describe('relativeTime', () => {
  const now = 1_700_000_000;
  it('formats seconds, minutes, hours, days, weeks', () => {
    expect(relativeTime(now - 30, now)).toBe('30s');
    expect(relativeTime(now - 120, now)).toBe('2m');
    expect(relativeTime(now - 3 * 3600, now)).toBe('3h');
    expect(relativeTime(now - 2 * 86400, now)).toBe('2d');
    expect(relativeTime(now - 21 * 86400, now)).toBe('3w');
  });
});
