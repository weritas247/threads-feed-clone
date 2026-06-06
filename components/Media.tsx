'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Media } from '@/lib/types';
import { proxied } from '@/lib/img';

// A single media element at its NATURAL aspect ratio (no crop). Images are clickable to
// open the lightbox; video plays inline (its own controls would fight a click handler).
function MediaEl({ m, className }: { m: Media; className: string }) {
  if (m.type === 'video') {
    return <video src={proxied(m.url)} controls playsInline className={className + ' bg-black'} />;
  }
  return (
    <Image
      src={proxied(m.url)}
      alt={m.alt ?? ''}
      width={m.width || 800}
      height={m.height || 800}
      className={className}
      unoptimized
    />
  );
}

// Full-screen lightbox: the original media on a dark backdrop, contained (never cropped),
// with carousel nav (arrows / dots / ←→ keys), Esc + backdrop-click to close, scroll lock,
// rendered in a portal so it escapes the card's stacking context.
function Lightbox({
  media,
  index,
  onClose,
  onIndex,
}: {
  media: Media[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const prev = useCallback(() => onIndex((index - 1 + media.length) % media.length), [index, media.length, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % media.length), [index, media.length, onIndex]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, next, prev]);

  if (!mounted) return null;
  const m = media[index];
  const multiple = media.length > 1;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="원본 미디어 보기"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white hover:bg-white/20"
      >
        ×
      </button>

      {/* Media (stopPropagation so clicking it doesn't close) */}
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] max-w-[92vw] items-center justify-center">
        {m.type === 'video' ? (
          <video
            src={proxied(m.url)}
            controls
            autoPlay
            playsInline
            className="max-h-[92vh] max-w-[92vw] rounded-lg bg-black"
          />
        ) : (
          <Image
            src={proxied(m.url)}
            alt={m.alt ?? ''}
            width={m.width || 1200}
            height={m.height || 1200}
            className="max-h-[92vh] w-auto rounded-lg object-contain"
            unoptimized
          />
        )}
      </div>

      {multiple && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="이전"
            className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="다음"
            className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
          >
            ›
          </button>
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs tabular-nums text-white">
              {index + 1} / {media.length}
            </span>
            <div className="flex gap-1.5">
              {media.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onIndex(i); }}
                  aria-label={`${i + 1}번째`}
                  className={'h-1.5 w-1.5 rounded-full ' + (i === index ? 'bg-white' : 'bg-white/40 hover:bg-white/70')}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}

export function MediaView({ media }: { media: Media[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (media.length === 0) return null;

  const openable = (m: Media) => m.type === 'image'; // video plays inline; images zoom

  const lightbox = open !== null && (
    <Lightbox media={media} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
  );

  // Single media: whole, natural ratio, capped. Image is click-to-zoom.
  if (media.length === 1) {
    const m = media[0];
    return (
      <>
        <div className="mt-2 overflow-hidden rounded-[8px] border border-border">
          {openable(m) ? (
            <button type="button" onClick={() => setOpen(0)} className="block w-full cursor-zoom-in" aria-label="원본 보기">
              <MediaEl m={m} className="mx-auto block max-h-[520px] w-full object-contain" />
            </button>
          ) : (
            <MediaEl m={m} className="mx-auto block max-h-[520px] w-full object-contain" />
          )}
        </div>
        {lightbox}
      </>
    );
  }

  // Multiple: a horizontal strip of square thumbnails; tap an image to open the carousel.
  return (
    <>
      <div className="mt-2 flex gap-2 overflow-x-auto">
        {media.map((m, i) => (
          <div key={i} className="aspect-square w-[70%] flex-none overflow-hidden rounded-[8px] border border-border">
            {openable(m) ? (
              <button type="button" onClick={() => setOpen(i)} className="block h-full w-full cursor-zoom-in" aria-label="원본 보기">
                <MediaEl m={m} className="h-full w-full object-cover" />
              </button>
            ) : (
              <MediaEl m={m} className="h-full w-full object-cover" />
            )}
          </div>
        ))}
      </div>
      {lightbox}
    </>
  );
}
