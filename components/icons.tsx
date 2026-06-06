// App icons, backed by the Lucide icon pack. These thin wrappers keep the original export
// names + signatures (e.g. BookmarkIcon's `filled`) so every call site stays unchanged,
// while the actual glyphs come from lucide-react. strokeWidth 1.8 matches the prior look.
import {
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  Sparkles,
  Bookmark,
  StickyNote,
  Tag,
  MoreHorizontal,
  Link2,
  Library,
} from 'lucide-react';

type P = { className?: string };
const base = 'h-[22px] w-[22px]';
const SW = 1.8;

export function HeartIcon({ className }: P) {
  return <Heart strokeWidth={SW} className={className ?? base} />;
}
export function ReplyIcon({ className }: P) {
  return <MessageCircle strokeWidth={SW} className={className ?? base} />;
}
export function RepostIcon({ className }: P) {
  return <Repeat2 strokeWidth={SW} className={className ?? base} />;
}
export function ShareIcon({ className }: P) {
  return <Send strokeWidth={SW} className={className ?? base} />;
}
export function SparkleIcon({ className }: P) {
  return <Sparkles strokeWidth={SW} className={className ?? base} />;
}
export function BookmarkIcon({ className, filled }: P & { filled?: boolean }) {
  return (
    <Bookmark strokeWidth={SW} fill={filled ? 'currentColor' : 'none'} className={className ?? base} />
  );
}
export function NoteIcon({ className }: P) {
  return <StickyNote strokeWidth={SW} className={className ?? base} />;
}
export function TagIcon({ className }: P) {
  return <Tag strokeWidth={SW} className={className ?? base} />;
}
export function MoreIcon({ className }: P) {
  return <MoreHorizontal strokeWidth={SW} className={className ?? 'h-5 w-5'} />;
}
export function LinkIcon({ className }: P) {
  return <Link2 strokeWidth={SW} className={className ?? base} />;
}
export function CollectionIcon({ className }: P) {
  return <Library strokeWidth={SW} className={className ?? base} />;
}
