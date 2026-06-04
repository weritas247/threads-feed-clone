import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

// Stores session cookies exported by the SNS Cookie Parser extension, per platform, in
// data/cookies/<platform>.json (git-ignored). Server-only. The values are sensitive —
// status() never returns them, only whether a session is present + counts/time.
// Dir overridable via ACCOUNTS_DATA_DIR (shared with the other stores).

export type CookiePlatform = 'instagram' | 'threads' | 'x';
export const COOKIE_PLATFORMS: CookiePlatform[] = ['instagram', 'threads', 'x'];

// The cookie whose presence means "logged in" for each platform.
const KEY_COOKIE: Record<CookiePlatform, string> = {
  instagram: 'sessionid',
  threads: 'sessionid',
  x: 'auth_token',
};

export interface StoredCookies {
  platform: CookiePlatform;
  cookies: Record<string, string>;
  savedAt: number; // unix ms
}

export interface SessionStatus {
  platform: CookiePlatform;
  connected: boolean; // key cookie present
  count: number;
  savedAt?: number;
}

function isCookiePlatform(p: unknown): p is CookiePlatform {
  return p === 'instagram' || p === 'threads' || p === 'x';
}

function cookiesDir(): string {
  const base = process.env.ACCOUNTS_DATA_DIR ?? join(process.cwd(), 'data');
  const dir = join(base, 'cookies');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function fileFor(platform: CookiePlatform): string {
  return join(cookiesDir(), `${platform}.json`);
}

export function setCookies(platform: string, cookies: Record<string, string>): StoredCookies | null {
  if (!isCookiePlatform(platform)) return null;
  const rec: StoredCookies = { platform, cookies: cookies ?? {}, savedAt: Date.now() };
  writeFileSync(fileFor(platform), JSON.stringify(rec));
  return rec;
}

export function getCookies(platform: CookiePlatform): StoredCookies | null {
  const file = fileFor(platform);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as StoredCookies;
  } catch {
    return null;
  }
}

// `name=value; …` for use as a Cookie request header (server-side authenticated fetch).
export function getCookieHeader(platform: CookiePlatform): string | null {
  const rec = getCookies(platform);
  if (!rec) return null;
  const header = Object.entries(rec.cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  return header || null;
}

export function clearCookies(platform: CookiePlatform): void {
  const file = fileFor(platform);
  if (existsSync(file)) unlinkSync(file);
}

// Value-free status for the UI: which platforms have a session, how many cookies, when.
export function status(): SessionStatus[] {
  return COOKIE_PLATFORMS.map((platform) => {
    const rec = getCookies(platform);
    return {
      platform,
      connected: Boolean(rec?.cookies?.[KEY_COOKIE[platform]]),
      count: rec ? Object.keys(rec.cookies).length : 0,
      savedAt: rec?.savedAt,
    };
  });
}
