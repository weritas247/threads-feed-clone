import { describe, it, expect } from 'vitest';
import { localEmbedder } from './embed';
import { cosine, norm } from '../vector';

describe('localEmbedder', () => {
  const e = localEmbedder();

  it('produces L2-normalized vectors of the right dim', async () => {
    const [v] = await e.embed(['hello world automation agent']);
    expect(v.length).toBe(e.dim);
    expect(norm(v)).toBeCloseTo(1);
  });

  it('is deterministic', async () => {
    const [a] = await e.embed(['same text here']);
    const [b] = await e.embed(['same text here']);
    expect(a).toEqual(b);
  });

  it('ranks topically-related text above unrelated (English)', async () => {
    const [query, related, unrelated] = await e.embed([
      'ai agent workflow automation tools',
      'building automation agents with workflow tools and ai',
      'my cat slept on the warm windowsill all afternoon',
    ]);
    expect(cosine(query, related)).toBeGreaterThan(cosine(query, unrelated));
  });

  it('captures Korean similarity via char bigrams', async () => {
    const [query, related, unrelated] = await e.embed([
      '자동화 에이전트 워크플로우',
      '에이전트 자동화 도구 워크플로우 구축',
      '오늘 점심으로 김치찌개를 먹었다',
    ]);
    expect(cosine(query, related)).toBeGreaterThan(cosine(query, unrelated));
  });
});
