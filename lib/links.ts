// Canonical URL of a post on the real Threads site.
export function threadPostUrl(username: string, code: string): string {
  const handle = username.trim().replace(/^@+/, '');
  return `https://www.threads.com/@${handle}/post/${code}`;
}
