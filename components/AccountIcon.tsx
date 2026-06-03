import { Avatar } from './Avatar';

// An account icon that is ALWAYS present next to a username: the real avatar when
// we have one, otherwise a circular initial placeholder.
export function AccountIcon({
  src,
  username,
  size = 28,
}: {
  src?: string;
  username: string;
  size?: number;
}) {
  if (src) return <Avatar src={src} username={username} size={size} />;
  const initial = (username.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-full bg-elevated font-semibold text-secondary"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-label={username}
    >
      {initial}
    </span>
  );
}
