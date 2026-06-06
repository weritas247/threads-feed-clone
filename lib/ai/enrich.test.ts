import { describe, it, expect } from 'vitest';
import { parseEnrichment, localEnrichOne, makeEnricher } from './enrich';
import type { Summarizer } from './types';

describe('parseEnrichment', () => {
  it('parses a clean JSON object', () => {
    const r = parseEnrichment(
      '{"summary":"A tip","topics":["AI","Agents"],"entities":[{"name":"Claude","type":"tool"}],"type":"tutorial","lang":"en","keepScore":0.8}',
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.topics).toEqual(['ai', 'agents']); // lowercased + deduped
      expect(r.value.entities[0]).toEqual({ name: 'Claude', type: 'tool' });
      expect(r.value.type).toBe('tutorial');
      expect(r.value.keepScore).toBe(0.8);
    }
  });

  it('tolerates code fences and surrounding prose', () => {
    const r = parseEnrichment('Here you go:\n```json\n{"summary":"x","topics":["t"],"type":"news","lang":"ko","keepScore":1.5}\n```');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.keepScore).toBe(1); // clamped to [0,1]
      expect(r.value.lang).toBe('ko');
    }
  });

  it('coerces unknown type/entity-type to safe defaults', () => {
    const r = parseEnrichment('{"summary":"x","topics":[],"entities":[{"name":"N","type":"alien"}],"type":"bogus","lang":"en","keepScore":0.5}');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.type).toBe('other');
      expect(r.value.entities[0].type).toBe('concept');
    }
  });

  it('fails cleanly on non-JSON', () => {
    expect(parseEnrichment('I cannot do that').ok).toBe(false);
  });
});

describe('localEnrichOne', () => {
  it('pulls hashtags as topics and flags links as resources', () => {
    const r = localEnrichOne('Great thread on #AI and #agents — see https://example.com');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.topics).toContain('ai');
      expect(r.value.type).toBe('resource');
      expect(r.value.keepScore).toBeGreaterThan(0.2);
    }
  });

  it('detects Korean and scores tiny posts low', () => {
    const r = localEnrichOne('ㅎㅇ');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.lang).toBe('ko');
      expect(r.value.keepScore).toBeLessThan(0.3);
    }
  });
});

describe('makeEnricher', () => {
  const okReply = '{"summary":"ok","topics":["t"],"type":"news","lang":"en","keepScore":0.6}';

  it('captures a provider error per-item without aborting the batch (no retry)', async () => {
    let call = 0;
    const flaky: Summarizer = {
      provider: 'claude',
      model: 'test',
      async summarize() {
        call++;
        if (call === 2) throw new Error('rate limited');
        return okReply;
      },
    };
    const out = await makeEnricher(flaky, 1, 0).enrich(['a', 'b', 'c']);
    expect(out.map((r) => r.ok)).toEqual([true, false, true]);
  });

  it('retries a transient failure and recovers', async () => {
    let calls = 0;
    const flaky: Summarizer = {
      provider: 'claude',
      model: 'test',
      async summarize() {
        calls++;
        if (calls === 1) throw new Error('429');
        return okReply;
      },
    };
    const out = await makeEnricher(flaky, 1, 2).enrich(['a']);
    expect(out[0].ok).toBe(true);
    expect(calls).toBe(2); // failed once, succeeded on retry
  });
});
