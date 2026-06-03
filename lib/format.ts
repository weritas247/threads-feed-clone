export function formatCount(n: number): string {
  if (!n || n <= 0) return '';
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const v = n / 1000;
    return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + 'K';
  }
  const v = n / 1_000_000;
  return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + 'M';
}

export function relativeTime(unixSeconds: number, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const diff = Math.max(0, nowSeconds - unixSeconds);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / (7 * 86400))}w`;
}
