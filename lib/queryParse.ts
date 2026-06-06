import type { SearchFilters } from './searchQuery';

// Parse a raw search box string into free TEXT + structured FILTERS using operators:
//   @author           #tag
//   topic:ai   topic:"ai agents"   entity:Claude   type:tutorial
//   platform:x   state:kept   after:2024-06-01   before:2024-12-31   has:media|note|preserved
// Anything else is free text. Quoted values may contain spaces.

export interface ParsedQuery {
  text: string;
  filters: SearchFilters;
}

const CONTENT_TYPES = new Set(['tutorial', 'news', 'opinion', 'launch', 'thread', 'resource', 'other']);
const STATES = new Set(['inbox', 'kept', 'archived', 'discarded']);

function toDate(s: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const t = Date.parse(s + 'T00:00:00Z');
  return Number.isNaN(t) ? undefined : Math.floor(t / 1000);
}

function applyOp(f: SearchFilters, key: string, raw: string): boolean {
  const v = raw.replace(/^"|"$/g, '');
  switch (key) {
    case 'topic':
      f.topic = v.toLowerCase();
      return true;
    case 'entity':
      f.entity = v;
      return true;
    case 'type':
      if (!CONTENT_TYPES.has(v)) return false;
      f.type = v;
      return true;
    case 'platform':
      if (v !== 'threads' && v !== 'x') return false;
      f.platform = v;
      return true;
    case 'state':
      if (!STATES.has(v)) return false;
      f.state = v as SearchFilters['state'];
      return true;
    case 'after': {
      const d = toDate(v);
      if (!d) return false;
      f.after = d;
      return true;
    }
    case 'before': {
      const d = toDate(v);
      if (!d) return false;
      f.before = d;
      return true;
    }
    case 'has':
      if (v !== 'media' && v !== 'note' && v !== 'preserved') return false;
      f.has = v;
      return true;
    default:
      return false;
  }
}

export function parseQuery(raw: string): ParsedQuery {
  const filters: SearchFilters = {};
  const text: string[] = [];
  // Tokens: key:"quoted", key:value, @x, #x, "quoted text", or a bare word.
  const tokens = raw.match(/[a-z]+:"[^"]*"|[a-z]+:[^\s]+|[@#][^\s]+|"[^"]*"|[^\s]+/gi) ?? [];

  for (const tok of tokens) {
    if (tok.startsWith('@') && tok.length > 1) {
      filters.author = tok.slice(1).toLowerCase();
      continue;
    }
    if (tok.startsWith('#') && tok.length > 1) {
      filters.tag = tok.slice(1).toLowerCase();
      continue;
    }
    const m = tok.match(/^([a-z]+):(.+)$/i);
    if (m && applyOp(filters, m[1].toLowerCase(), m[2])) continue;
    // Plain text (strip wrapping quotes).
    text.push(tok.replace(/^"|"$/g, ''));
  }

  return { text: text.join(' ').trim(), filters };
}

// Merge structured filters — `b` (e.g. inline operators) overrides `a` (e.g. facet params).
export function mergeFilters(a: SearchFilters, b: SearchFilters): SearchFilters {
  return { ...a, ...b };
}
