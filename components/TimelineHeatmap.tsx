'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Heatmap, HeatCell } from '@/lib/timeline';

// GitHub-contributions-style calendar heatmap. Replaces the flat bar chart: density by
// colour, hover shows the exact day + count, and clicking a day drills the feed below into
// that day (?day=…). Far more information + real interaction than the old static bars.

const WEEKDAYS = ['일', '', '화', '', '목', '', '토'];

function level(count: number, max: number): number {
  if (count <= 0) return 0;
  if (max <= 0) return 1;
  return Math.min(4, Math.ceil((count / max) * 4));
}
const LEVEL_BG = ['bg-elevated', 'bg-fg/25', 'bg-fg/45', 'bg-fg/65', 'bg-fg/90'];

function fmt(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

export function TimelineHeatmap({ heatmap, activeDay }: { heatmap: Heatmap; activeDay?: string }) {
  const [hover, setHover] = useState<HeatCell | null>(null);
  const PITCH = 15; // 12px cell + 3px gap

  const caption = hover
    ? `${fmt(hover.date)} · 포스트 ${hover.count}개`
    : `${fmt(heatmap.rangeStart)} – ${fmt(heatmap.rangeEnd)}`;

  return (
    <div className="border-b border-border px-4 py-3">
      <div className="overflow-x-auto">
        {/* month labels */}
        <div className="relative mb-1 ml-6 h-4 text-[10px] text-secondary">
          {heatmap.months.map((m) => (
            <span key={`${m.col}-${m.label}`} className="absolute" style={{ left: m.col * PITCH }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {/* weekday labels */}
          <div className="mr-1 flex w-5 flex-col gap-[3px] text-[9px] leading-3 text-secondary">
            {WEEKDAYS.map((w, i) => (
              <span key={i} className="h-3">
                {w}
              </span>
            ))}
          </div>
          {heatmap.weeks.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((cell) => {
                if (cell.future) return <div key={cell.date} className="h-3 w-3" />;
                const active = activeDay === cell.date;
                const cls =
                  'h-3 w-3 rounded-[2px] ' +
                  LEVEL_BG[level(cell.count, heatmap.maxCount)] +
                  (active ? ' ring-2 ring-fg ring-offset-1 ring-offset-bg' : '');
                // Only days with posts are drill-downs; empty days just show their caption on hover.
                if (cell.count === 0) {
                  return (
                    <div
                      key={cell.date}
                      onMouseEnter={() => setHover(cell)}
                      onMouseLeave={() => setHover(null)}
                      className={cls}
                    />
                  );
                }
                return (
                  <Link
                    key={cell.date}
                    href={active ? '/timeline' : `/timeline?day=${cell.date}`}
                    scroll={false}
                    onMouseEnter={() => setHover(cell)}
                    onMouseLeave={() => setHover(null)}
                    aria-label={`${cell.date}: 포스트 ${cell.count}개`}
                    className={cls + ' transition-transform hover:scale-125'}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-secondary">
        <span className="tabular-nums">{caption}</span>
        <span className="flex items-center gap-1">
          적음
          {LEVEL_BG.map((bg, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-[2px] ${bg}`} />
          ))}
          많음
        </span>
      </div>
    </div>
  );
}
