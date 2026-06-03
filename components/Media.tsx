import Image from 'next/image';
import type { Media } from '@/lib/types';
import { proxied } from '@/lib/img';

function Item({ m }: { m: Media }) {
  if (m.type === 'video') {
    return (
      <video src={proxied(m.url)} controls playsInline className="h-full w-full rounded-[8px] object-cover" />
    );
  }
  return (
    <Image
      src={proxied(m.url)}
      alt={m.alt ?? ''}
      width={m.width || 500}
      height={m.height || 500}
      className="h-full w-full rounded-[8px] object-cover"
      unoptimized
    />
  );
}

export function MediaView({ media }: { media: Media[] }) {
  if (media.length === 0) return null;
  if (media.length === 1) {
    return (
      <div className="mt-2 max-h-[430px] overflow-hidden rounded-[8px] border border-border">
        <Item m={media[0]} />
      </div>
    );
  }
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto">
      {media.map((m, i) => (
        <div key={i} className="aspect-square w-[70%] flex-none overflow-hidden rounded-[8px] border border-border">
          <Item m={m} />
        </div>
      ))}
    </div>
  );
}
