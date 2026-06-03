import { describe, it, expect } from 'vitest';
import { threadPostUrl } from './links';

describe('threadPostUrl', () => {
  it('builds the canonical threads.com permalink', () => {
    expect(threadPostUrl('autogod.ai', 'DY4pPrPkzuJ')).toBe(
      'https://www.threads.com/@autogod.ai/post/DY4pPrPkzuJ',
    );
  });
  it('tolerates a leading @ on the username', () => {
    expect(threadPostUrl('@zuck', 'ABC')).toBe('https://www.threads.com/@zuck/post/ABC');
  });
});
