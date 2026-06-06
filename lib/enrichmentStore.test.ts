import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getEnrichment,
  setEnrichment,
  setEnrichments,
  freshKeys,
  topicCounts,
  keysWithTopic,
  addTopic,
  removeTopic,
  getTopicMap,
  relatedTopics,
  entityCounts,
  keysWithEntity,
  topicGraph,
  mergeTopic,
} from './enrichmentStore';
import type { Enrichment } from './types';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'enr-'));
  process.env.ACCOUNTS_DATA_DIR = dir;
});
afterEach(() => {
  delete process.env.ACCOUNTS_DATA_DIR;
  rmSync(dir, { recursive: true, force: true });
});

const mk = (over: Partial<Enrichment> = {}): Enrichment => ({
  summary: 's',
  topics: ['ai'],
  entities: [],
  type: 'news',
  lang: 'en',
  keepScore: 0.7,
  promptVersion: 'enrich-v1',
  enrichedAt: 1,
  ...over,
});

describe('enrichmentStore', () => {
  it('round-trips an enrichment', () => {
    setEnrichment('threads', '1', mk());
    expect(getEnrichment('threads', '1')?.topics).toEqual(['ai']);
  });

  it('freshKeys returns only keys at the current prompt version', () => {
    setEnrichments([
      ['threads:1', mk({ promptVersion: 'enrich-v1' })],
      ['threads:2', mk({ promptVersion: 'old' })],
    ]);
    expect(freshKeys('enrich-v1')).toEqual(new Set(['threads:1']));
  });

  it('aggregates topic counts sorted by count desc', () => {
    setEnrichments([
      ['threads:1', mk({ topics: ['ai', 'agents'] })],
      ['threads:2', mk({ topics: ['ai'] })],
    ]);
    expect(topicCounts()).toEqual([
      { topic: 'ai', count: 2 },
      { topic: 'agents', count: 1 },
    ]);
  });

  it('keysWithTopic finds posts carrying a topic', () => {
    setEnrichments([
      ['threads:1', mk({ topics: ['ai', 'rag'] })],
      ['x:2', mk({ topics: ['design'] })],
    ]);
    expect(keysWithTopic('rag')).toEqual(new Set(['threads:1']));
  });

  it('addTopic creates a manual record (edited) for an un-enriched post', () => {
    const topics = addTopic('threads', '9', 'AI Agents');
    expect(topics).toEqual(['ai agents']); // normalized
    expect(getEnrichment('threads', '9')?.edited).toBe(true);
  });

  it('removeTopic drops a topic and keeps the record edited', () => {
    setEnrichment('threads', '1', mk({ topics: ['ai', 'rag'] }));
    expect(removeTopic('threads', '1', 'ai')).toEqual(['rag']);
    expect(getEnrichment('threads', '1')?.edited).toBe(true);
  });

  it('edited records are treated as fresh so the pipeline never overwrites them', () => {
    addTopic('threads', '5', 'mine');
    // promptVersion is 'manual', not 'enrich-v1', but edited → still fresh:
    expect(freshKeys('enrich-v1').has('threads:5')).toBe(true);
  });

  it('getTopicMap returns key → topics for non-empty records', () => {
    setEnrichment('threads', '1', mk({ topics: ['ai'] }));
    expect(getTopicMap()['threads:1']).toEqual(['ai']);
  });

  it('relatedTopics ranks co-occurring topics by shared-post count', () => {
    setEnrichments([
      ['threads:1', mk({ topics: ['ai', 'agents', 'rag'] })],
      ['threads:2', mk({ topics: ['ai', 'agents'] })],
      ['threads:3', mk({ topics: ['ai', 'design'] })],
    ]);
    const rel = relatedTopics('ai');
    expect(rel).toEqual([
      { topic: 'agents', count: 2 },
      { topic: 'design', count: 1 },
      { topic: 'rag', count: 1 },
    ]);
  });

  it('entityCounts aggregates by name with type and count', () => {
    setEnrichments([
      ['threads:1', mk({ entities: [{ name: 'Claude', type: 'tool' }] })],
      ['threads:2', mk({ entities: [{ name: 'Claude', type: 'tool' }, { name: 'OpenAI', type: 'company' }] })],
    ]);
    expect(entityCounts()).toEqual([
      { name: 'Claude', type: 'tool', count: 2 },
      { name: 'OpenAI', type: 'company', count: 1 },
    ]);
  });

  it('keysWithEntity finds posts mentioning an entity (case-insensitive)', () => {
    setEnrichments([
      ['threads:1', mk({ entities: [{ name: 'Claude', type: 'tool' }] })],
      ['x:2', mk({ entities: [{ name: 'Gemini', type: 'tool' }] })],
    ]);
    expect(keysWithEntity('claude')).toEqual(new Set(['threads:1']));
  });

  it('mergeTopic folds a synonym across records, dedupes, and marks edited', () => {
    setEnrichments([
      ['threads:1', mk({ topics: ['ai', 'rag'] })],
      ['threads:2', mk({ topics: ['ai agents', 'ai'] })], // would dedupe to ['ai agents']
      ['threads:3', mk({ topics: ['design'] })],
    ]);
    const changed = mergeTopic('ai', 'ai agents');
    expect(changed).toBe(2);
    expect(getEnrichment('threads', '1')?.topics.sort()).toEqual(['ai agents', 'rag']);
    expect(getEnrichment('threads', '2')?.topics).toEqual(['ai agents']); // deduped
    expect(getEnrichment('threads', '1')?.edited).toBe(true);
    expect(getEnrichment('threads', '3')?.topics).toEqual(['design']); // untouched
  });

  it('mergeTopic is a no-op for blank or identical topics', () => {
    setEnrichment('threads', '1', mk({ topics: ['ai'] }));
    expect(mergeTopic('ai', 'ai')).toBe(0);
    expect(mergeTopic('', 'x')).toBe(0);
  });

  it('topicGraph builds nodes and co-occurrence edges (handles multi-word topics)', () => {
    setEnrichments([
      ['threads:1', mk({ topics: ['ai agents', 'rag'] })],
      ['threads:2', mk({ topics: ['ai agents', 'rag'] })],
      ['threads:3', mk({ topics: ['ai agents'] })],
    ]);
    const g = topicGraph(10, 2);
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['ai agents', 'rag']);
    // 'ai agents' + 'rag' co-occur in 2 posts → one edge, weight 2, endpoints intact
    expect(g.edges).toEqual([{ a: 'ai agents', b: 'rag', weight: 2 }]);
  });
});
