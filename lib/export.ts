import type { Post } from './types';

// Render a collection as a portable Markdown document. Pure (no I/O) so it's unit-tested.
// `obsidian` mode renders topics/tags as [[wikilinks]] for graph linking; otherwise as
// #hashtags. Includes the saved synthesis note (if any) up top, then each post with its
// author, date, body, tags, and a link back to the original.

const isoDate = (unixSec: number): string =>
  new Date(unixSec * 1000).toISOString().slice(0, 10);

function tagLine(tags: string[], obsidian: boolean): string {
  if (tags.length === 0) return '';
  const rendered = obsidian ? tags.map((t) => `[[${t}]]`).join(' ') : tags.map((t) => `#${t}`).join(' ');
  return `\nTags: ${rendered}`;
}

export interface ExportOptions {
  name: string;
  note?: string;
  obsidian?: boolean;
  tagsOf?: (p: Post) => string[];
}

export function collectionToMarkdown(posts: Post[], opts: ExportOptions): string {
  const { name, note = '', obsidian = false, tagsOf } = opts;
  const lines: string[] = [];
  lines.push(`# ${name}`, '');
  lines.push(`> ${posts.length} ${posts.length === 1 ? 'post' : 'posts'} · exported from Threads/X Knowledge Base`, '');

  if (note.trim()) {
    lines.push('## Synthesis', '', note.trim(), '');
  }

  lines.push('## Posts', '');
  for (const p of posts) {
    lines.push(`### @${p.author.username} · ${p.platform === 'x' ? 'X' : 'Threads'} · ${isoDate(p.createdAt)}`);
    const body = (p.text ?? '').trim();
    if (body) lines.push('', body);
    const chain = (p.chain ?? []).map((c) => c.text?.trim()).filter(Boolean);
    for (const c of chain) lines.push('', c);
    const tags = tagsOf?.(p) ?? [];
    const tl = tagLine(tags, obsidian);
    if (tl) lines.push(tl.trimStart());
    if (p.permalink) lines.push('', `[Original](${p.permalink})`);
    lines.push('', '---', '');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

// A filesystem-safe filename stem from a collection name (keeps unicode letters; used for
// the UTF-8 `filename*` of Content-Disposition).
export function safeFilename(name: string): string {
  return (name.trim() || 'collection').replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'collection';
}

// ASCII-only stem for the latin1 `filename=` fallback (HTTP headers are ByteStrings, so a
// Korean filename would throw). Non-ASCII is stripped; falls back to 'collection'.
export function asciiFilename(name: string): string {
  return (name.trim() || 'collection').replace(/[^\x20-\x7E]+/g, '-').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'collection';
}
