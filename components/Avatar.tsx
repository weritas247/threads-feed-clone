import Image from 'next/image';

export function Avatar({ src, username, size = 36 }: { src: string; username: string; size?: number }) {
  return (
    <Image
      src={src}
      alt={username}
      width={size}
      height={size}
      className="rounded-full object-cover"
      unoptimized
    />
  );
}
