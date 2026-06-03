import Image from 'next/image';
import { proxied } from '@/lib/img';

export function Avatar({ src, username, size = 36 }: { src: string; username: string; size?: number }) {
  return (
    <Image
      src={proxied(src)}
      alt={username}
      width={size}
      height={size}
      className="rounded-full object-cover"
      unoptimized
    />
  );
}
