import { readMedia } from '@/lib/mediaArchive';

export const dynamic = 'force-dynamic';

// GET ?f=<filename> → serve a locally-archived media file. Filename is strictly validated
// (hash.ext only) so there's no path traversal. Cached aggressively — archived files are
// immutable (content-addressed by URL hash).
export function GET(request: Request): Response {
  const f = new URL(request.url).searchParams.get('f') ?? '';
  const file = readMedia(f);
  if (!file) return new Response('not found', { status: 404 });
  return new Response(file.buf, {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
