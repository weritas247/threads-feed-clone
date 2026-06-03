import { isAllowedImageHost } from '@/lib/img';

// Proxy Threads/Instagram CDN images same-origin so the browser's
// Cross-Origin-Resource-Policy doesn't block them (profile pictures especially).
export const revalidate = 86400;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url).searchParams.get('url');
  if (!url || !isAllowedImageHost(url)) {
    return new Response('Bad request', { status: 400 });
  }
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: { Referer: 'https://www.threads.com/', 'User-Agent': 'Mozilla/5.0' },
    });
  } catch {
    return new Response('Upstream error', { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response('Upstream error', { status: 502 });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
