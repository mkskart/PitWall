'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Thin scrubber timeline. Dragging anywhere on the track seeks to that race
 * timestamp. The fill and handle are driven by `elapsed / duration`.
 */
export function PlaybackBar({
  elapsed,
  duration,
  onSeek,
  accent = '#FF8000',
}: {
  elapsed: number;
  duration: number;
  onSeek: (t: number) => void;
  accent?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const pct = duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 0;

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || duration <= 0) return;
      const rect = el.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onSeek(f * duration);
    },
    [duration, onSeek],
  );

  return (
    <div
      ref={trackRef}
      className="relative h-6 flex items-center cursor-pointer select-none flex-1 group"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDragging(true);
        seekFromEvent(e.clientX);
      }}
      onPointerMove={(e) => dragging && seekFromEvent(e.clientX)}
      onPointerUp={(e) => {
        setDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }}
    >
      <div className="relative w-full h-[3px] bg-[#ffffff14]" style={{ borderRadius: 2 }}>
        <div
          className="absolute left-0 top-0 bottom-0"
          style={{ width: `${pct * 100}%`, backgroundColor: accent, borderRadius: 2 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full transition-transform group-hover:scale-110"
          style={{
            left: `${pct * 100}%`,
            backgroundColor: accent,
            boxShadow: `0 0 8px ${accent}`,
          }}
        />
      </div>
    </div>
  );
}
