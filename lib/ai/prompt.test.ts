import { describe, it, expect } from 'vitest';
import { buildFeedText, postsToItems, SUMMARY_SYSTEM } from './prompt';
import type { Platform, Post } from '../types';

const item = (username: string, text: string, platform: Platform = 'threads') => ({
  username,
  platform,
  text,
});

describe('buildFeedText', () => {
  it('renders one numbered line per post with author + platform', () => {
    const out = buildFeedText([item('alice', 'hello'), item('bob', 'world', 'x')]);
    expect(out).toBe('1. @alice (threads): hello\n2. @bob (x): world');
  });

  it('skips empty-text posts and renumbers', () => {
    const out = buildFeedText([item('a', '   '), item('b', 'kept')]);
    expect(out).toBe('1. @b (threads): kept');
  });

  it('collapses whitespace and clips long text', () => {
    const out = buildFeedText([item('a', 'x'.repeat(400))]);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThan(320);
  });

  it('system prompt forbids preamble', () => {
    expect(SUMMARY_SYSTEM).toMatch(/ONLY the summary/);
  });
});

describe('postsToItems', () => {
  it('projects posts to the minimal summarizable shape', () => {
    const post = {
      author: { username: 'carol' },
      platform: 'x',
      text: 'hi',
    } as Post;
    expect(postsToItems([post])).toEqual([{ username: 'carol', platform: 'x', text: 'hi' }]);
  });
});
