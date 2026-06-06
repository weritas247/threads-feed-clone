import { topicCounts, entityCounts } from '@/lib/enrichmentStore';
import { allPostTags } from '@/lib/postTagStore';
import { getAccounts } from '@/lib/accountStore';

export const dynamic = 'force-dynamic';

export interface Suggestion {
  kind: 'topic' | 'entity' | 'author' | 'tag' | 'operator';
  value: string; // text to insert
  label: string; // display
  count?: number;
}

const OPERATORS: Suggestion[] = [
  { kind: 'operator', value: 'topic:', label: 'topic: 토픽으로' },
  { kind: 'operator', value: 'entity:', label: 'entity: 엔티티로' },
  { kind: 'operator', value: 'type:', label: 'type: 유형으로' },
  { kind: 'operator', value: 'state:', label: 'state: 분류로' },
  { kind: 'operator', value: 'platform:', label: 'platform: 플랫폼으로' },
  { kind: 'operator', value: 'after:', label: 'after: 이후 날짜' },
  { kind: 'operator', value: 'has:media', label: 'has:media 미디어 있음' },
  { kind: 'operator', value: 'has:note', label: 'has:note 메모 있음' },
];

// GET ?token=<last word> → autocomplete suggestions for the current token. Matches the
// token against topics / entities / authors / tags (and operator keywords), prefix-first.
export function GET(request: Request): Response {
  const token = (new URL(request.url).searchParams.get('token') ?? '').trim().toLowerCase();
  if (!token) return Response.json({ suggestions: [] });

  const out: Suggestion[] = [];

  // Operator-scoped: `topic:ai` → suggest topic values; `@man` → authors.
  if (token.startsWith('@')) {
    const q = token.slice(1);
    pushAuthors(out, q, '@');
    return Response.json({ suggestions: out.slice(0, 8) });
  }
  if (token.startsWith('#')) {
    const q = token.slice(1);
    for (const t of allPostTags()) if (t.includes(q)) out.push({ kind: 'tag', value: `#${t}`, label: `#${t}` });
    return Response.json({ suggestions: out.slice(0, 8) });
  }
  const opMatch = token.match(/^(topic|entity|author):(.*)$/);
  if (opMatch) {
    const [, key, q] = opMatch;
    if (key === 'topic') for (const t of topicCounts()) if (t.topic.includes(q)) out.push({ kind: 'topic', value: `topic:${t.topic.includes(' ') ? `"${t.topic}"` : t.topic}`, label: t.topic, count: t.count });
    if (key === 'entity') for (const e of entityCounts()) if (e.name.toLowerCase().includes(q)) out.push({ kind: 'entity', value: `entity:${e.name.includes(' ') ? `"${e.name}"` : e.name}`, label: e.name, count: e.count });
    if (key === 'author') pushAuthors(out, q, 'author:');
    return Response.json({ suggestions: out.slice(0, 8) });
  }

  // Bare token: mix topics, entities, authors, tags + operator keywords.
  for (const t of topicCounts()) if (t.topic.includes(token)) out.push({ kind: 'topic', value: t.topic.includes(' ') ? `topic:"${t.topic}"` : `topic:${t.topic}`, label: `토픽 · ${t.topic}`, count: t.count });
  for (const e of entityCounts()) if (e.name.toLowerCase().includes(token)) out.push({ kind: 'entity', value: e.name.includes(' ') ? `entity:"${e.name}"` : `entity:${e.name}`, label: `엔티티 · ${e.name}`, count: e.count });
  pushAuthors(out, token, '@');
  for (const op of OPERATORS) if (op.value.startsWith(token)) out.push(op);

  return Response.json({ suggestions: out.slice(0, 10) });
}

function pushAuthors(out: Suggestion[], q: string, prefix: string): void {
  for (const a of getAccounts()) {
    if (a.username.toLowerCase().includes(q)) {
      out.push({ kind: 'author', value: `${prefix}${a.username}`, label: `@${a.username}` });
    }
  }
}
