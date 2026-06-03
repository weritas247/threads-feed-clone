type P = { className?: string };
const base = 'h-[22px] w-[22px]';

export function HeartIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? base}>
      <path d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5.5 5.5 5.5c1.9 0 3 1 2.5 1.5C9.5 5.5 10.5 5 12 5s2.5.5 4 2c-.5-.5.6-1.5 2.5-1.5 3 0 4.5 3 3 6C19 15.65 12 20 12 20z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
export function ReplyIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? base}>
      <path d="M12 21c5 0 9-3.6 9-8.5S17 4 12 4 3 7.6 3 12.5c0 1.7.5 3.3 1.4 4.6L3 21l4.3-1.2c1.4.8 3 1.2 4.7 1.2z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
export function RepostIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? base}>
      <path d="M7 7h9l-2-2M17 17H8l2 2M17 7v8M7 17V9" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
export function ShareIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? base}>
      <path d="M22 3 11 14M22 3l-7 19-4-8-8-4 19-7z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
export function MoreIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className ?? 'h-5 w-5'}>
      <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
