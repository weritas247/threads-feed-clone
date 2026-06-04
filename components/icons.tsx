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
export function SparkleIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? base}>
      <path d="M12 3l1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
export function BookmarkIcon({ className, filled }: P & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className={className ?? base}>
      <path d="M6 3.5h12c.55 0 1 .45 1 1V21l-7-3.2L5 21V4.5c0-.55.45-1 1-1z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
export function NoteIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? base}>
      <path d="M5 4h14a1 1 0 0 1 1 1v10l-5 5H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M20 15h-4a1 1 0 0 0-1 1v4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M8 9h8M8 12.5h5" strokeLinecap="round" />
    </svg>
  );
}
export function TagIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? base}>
      <path d="M3 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8-9-9z" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
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
