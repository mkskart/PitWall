'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRaceStore } from '@/store/raceStore';

/**
 * Frame-accurate scrubber timeline. Dragging anywhere seeks to that race
 * timestamp. Lap markers tick every 5 laps; pit stops shade their lap window
 * on the bar so strategy phases are visible at a glance.
 */
export function PlaybackBar({
  elapsed,
  duration,
  totalLaps,
  onSeek,
  accent = '#FF8000',
}: {
  elapsed: number;
  duration: number;
  totalLaps: number;
  onSeek: (t: number) => void;
  accent?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const pits = useRaceStore((s) => s.pits);
  const pct = duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 0;

  // Lap markers every 5 laps (uniform lap-time approximation across the bar).
  const lapTicks = useMemo(() => {
    if (totalLaps <= 0) return [];
    const ticks: { frac: number; lap: number }[] = [];
    for (let lap = 5; lap < totalLaps; lap += 5) ticks.push({ frac: lap / totalLaps, lap });
    return ticks;
  }, [totalLaps]);

  // Pit-window shading: ±half a lap around each stop.
  const pitWindows = useMemo(() => {
    if (totalLaps <= 0) return [];
    return pits.map((p) => ({
      left: Math.max(0, (p.lapNumber - 0.5) / totalLaps),
      width: Math.min(1, 1 / totalLaps),
    }));
  }, [pits, totalLaps]);

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
      className="relative h-6 flex items-center cursor-pointer select-none flex-1 group touch-none"
      role="slider"
      aria-label="Race timeline"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(elapsed)}
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
        {/* pit windows */}
        {pitWindows.map((w, i) => (
          <div
            key={i}
            className="absolute -top-[3px] -bottom-[3px] bg-[#ffffff1c] pointer-events-none"
            style={{ left: `${w.left * 100}%`, width: `${Math.max(0.4, w.width * 100)}%` }}
          />
        ))}
        {/* lap markers */}
        {lapTicks.map((t) => (
          <div
            key={t.lap}
            className="absolute -top-[2px] -bottom-[2px] w-px bg-[#ffffff30] pointer-events-none"
            style={{ left: `${t.frac * 100}%` }}
            title={`Lap ${t.lap}`}
          />
        ))}
        {/* progress fill */}
        <div
          className="absolute left-0 top-0 bottom-0"
          style={{ width: `${pct * 100}%`, backgroundColor: accent, borderRadius: 2 }}
        />
        {/* handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full transition-transform duration-150 group-hover:scale-110"
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
