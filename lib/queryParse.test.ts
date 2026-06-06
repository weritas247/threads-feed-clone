import { describe, it, expect } from 'vitest';
import { parseQuery, mergeFilters } from './queryParse';

describe('parseQuery', () => {
  it('splits free text from operators', () => {
    const r = parseQuery('agent automation @manus topic:ai state:kept');
    expect(r.text).toBe('agent automation');
    expect(r.filters.author).toBe('manus');
    expect(r.filters.topic).toBe('ai');
    expect(r.filters.state).toBe('kept');
  });

  it('supports quoted multi-word values and #tag', () => {
    const r = parseQuery('topic:"ai agents" #fav cool stuff');
    expect(r.filters.topic).toBe('ai agents');
    expect(r.filters.tag).toBe('fav');
    expect(r.text).toBe('cool stuff');
  });

  it('parses dates, platform, type, has', () => {
    const r = parseQuery('platform:x type:tutorial after:2024-06-01 has:media');
    expect(r.filters.platform).toBe('x');
    expect(r.filters.type).toBe('tutorial');
    expect(r.filters.after).toBe(Math.floor(Date.parse('2024-06-01T00:00:00Z') / 1000));
    expect(r.filters.has).toBe('media');
    expect(r.text).toBe('');
  });

  it('treats unknown operators / invalid values as plain text', () => {
    const r = parseQuery('foo:bar type:bogus hello');
    expect(r.filters.type).toBeUndefined();
    expect(r.text).toBe('foo:bar type:bogus hello');
  });
});

describe('mergeFilters', () => {
  it('lets inline operators override facet params', () => {
    const merged = mergeFilters({ type: 'news', platform: 'threads' }, { type: 'tutorial' });
    expect(merged.type).toBe('tutorial');
    expect(merged.platform).toBe('threads');
  });
});
