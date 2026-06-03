export interface Segment {
  text: string;
  match: boolean;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Split `text` into segments, marking the parts that match any of `terms`
// (case-insensitive). Used to render <mark> highlights without dangerouslySetInnerHTML.
export function highlightSegments(text: string, terms: string[]): Segment[] {
  const clean = [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
  if (clean.length === 0) return [{ text, match: false }];
  const re = new RegExp(`(${clean.map(escapeRegExp).join('|')})`, 'gi');
  const segments: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index), match: false });
    segments.push({ text: m[0], match: true });
    last = m.index + m[0].length;
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-length matches
  }
  if (last < text.length) segments.push({ text: text.slice(last), match: false });
  return segments;
}
