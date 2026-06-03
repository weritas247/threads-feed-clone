import { highlightSegments } from '@/lib/highlight';

// Renders `text` with any segments matching `terms` wrapped in <mark>.
export function Highlight({ text, terms = [] }: { text: string; terms?: string[] }) {
  if (terms.length === 0) return <>{text}</>;
  return (
    <>
      {highlightSegments(text, terms).map((seg, i) =>
        seg.match ? (
          <mark key={i} className="rounded-[3px] bg-yellow-400/40 px-[1px] font-medium text-fg">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
