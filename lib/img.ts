// Threads/Instagram profile pictures are served with a Cross-Origin-Resource-Policy
// that the browser blocks when loaded from our origin. Route image URLs through our
// own server (`/api/img`), which fetches them server-side (no CORP enforcement) and
// re-serves them same-origin.

const ALLOWED_HOST = /(^|\.)cdninstagram\.com$|(^|\.)fbcdn\.net$/;

export function isAllowedImageHost(url: string): boolean {
  try {
    return ALLOWED_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function proxied(url: string): string {
  if (!url || !/^https?:\/\//.test(url)) return url;
  return `/api/img?url=${encodeURIComponent(url)}`;
}
