import { getCollection } from '@/lib/collectionStore';
import { resolveByKeys } from '@/lib/pipeline';
import { getTagMap } from '@/lib/postTagStore';
import { collectionToMarkdown, safeFilename, asciiFilename } from '@/lib/export';
import type { Post } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET ?id=...&format=md|obsidian → download the collection as a Markdown file.
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  const obsidian = url.searchParams.get('format') === 'obsidian';

  const collection = getCollection(id);
  if (!collection) return new Response('collection not found', { status: 404 });

  const posts = resolveByKeys(collection.postKeys);
  const tagMap = getTagMap();
  const tagsOf = (p: Post) => tagMap[`${p.platform}:${p.id}`] ?? [];

  const md = collectionToMarkdown(posts, {
    name: collection.name,
    note: collection.note,
    obsidian,
    tagsOf,
  });

  // HTTP headers are latin1, so a Korean filename needs an ASCII fallback plus an RFC 5987
  // UTF-8 `filename*` for browsers that support it.
  const ascii = asciiFilename(collection.name);
  const utf8 = encodeURIComponent(`${safeFilename(collection.name)}.md`);
  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${ascii}.md"; filename*=UTF-8''${utf8}`,
    },
  });
}
