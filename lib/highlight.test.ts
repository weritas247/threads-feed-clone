import { describe, it, expect } from 'vitest';
import { highlightSegments } from './highlight';

describe('highlightSegments', () => {
  it('returns the whole text as one non-match segment when no terms', () => {
    expect(highlightSegments('hello world', [])).toEqual([{ text: 'hello world', match: false }]);
  });

  it('marks a single case-insensitive match', () => {
    expect(highlightSegments('Hello World', ['world'])).toEqual([
      { text: 'Hello ', match: false },
      { text: 'World', match: true },
    ]);
  });

  it('marks multiple terms and multiple occurrences', () => {
    const segs = highlightSegments('ai and AI and code', ['ai', 'code']);
    expect(segs.filter((s) => s.match).map((s) => s.text)).toEqual(['ai', 'AI', 'code']);
    // reconstructing the segments yields the original text
    expect(segs.map((s) => s.text).join('')).toBe('ai and AI and code');
  });

  it('escapes regex special characters in terms', () => {
    expect(highlightSegments('a.b.c', ['.'])).toEqual([
      { text: 'a', match: false },
      { text: '.', match: true },
      { text: 'b', match: false },
      { text: '.', match: true },
      { text: 'c', match: false },
    ]);
  });
});
