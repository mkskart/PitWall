'use client';

import { useMemo } from 'react';
import { useRaceStore } from '@/store/raceStore';
import { COMPOUND_COLORS } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Full-width pit-strategy timeline. One row per driver (in running order),
 * stints drawn as compound-colored blocks across the race distance, pit stops
 * as vertical ticks, and a moving vertical line marking the current lap.
 */
export function PitStrategyTimeline() {
  const order = useRaceStore((s) => s.order);
  const drivers = useRaceStore((s) => s.driversByNumber);
  const stints = useRaceStore((s) => s.stints);
  const pits = useRaceStore((s) => s.pits);
  const totalLaps = useRaceStore((s) => s.clock.totalLaps) || 57;
  const currentLap = useRaceStore((s) => s.clock.lap);

  const stintsByDriver = useMemo(() => {
    const map = new Map<number, typeof stints>();
    for (const s of stints) {
      const arr = map.get(s.driverNumber) ?? [];
      arr.push(s);
      map.set(s.driverNumber, arr);
    }
    return map;
  }, [stints]);

  const pitsByDriver = useMemo(() => {
    const map = new Map<number, typeof pits>();
    for (const p of pits) {
      const arr = map.get(p.driverNumber) ?? [];
      arr.push(p);
      map.set(p.driverNumber, arr);
    }
    return map;
  }, [pits]);

  const lapPct = (lap: number) => `${(Math.max(0, Math.min(totalLaps, lap)) / totalLaps) * 100}%`;

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 h-8 border-b border-border shrink-0">
        <span className="label">Pit Strategy</span>
        <span className="mono text-[10px] text-muted">
          LAP {currentLap} / {totalLaps}
        </span>
      </div>
      <div className="relative flex-1 overflow-y-auto">
        {/* current-lap scrubber across all rows */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/60 z-10 pointer-events-none"
          style={{ left: lapPct(currentLap) }}
        />
        <div className="flex flex-col">
          {order.map((num) => {
            const driver = drivers[num];
            if (!driver) return null;
            const ds = (stintsByDriver.get(num) ?? []).slice().sort((a, b) => a.lapStart - b.lapStart);
            const dp = pitsByDriver.get(num) ?? [];
            return (
              <div key={num} className="flex items-center gap-2 h-6 px-2 hover:bg-[#ffffff05]">
                <span className="mono text-[10px] w-8 shrink-0" style={{ color: driver.color }}>
                  {driver.code}
                </span>
                <div className="relative flex-1 h-3 bg-[#ffffff06]" style={{ borderRadius: 2 }}>
                  {ds.map((s, i) => {
                    const left = (Math.max(0, s.lapStart - 1) / totalLaps) * 100;
                    const width = (Math.max(0, s.lapEnd - s.lapStart + 1) / totalLaps) * 100;
                    return (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: COMPOUND_COLORS[s.compound],
                          opacity: 0.85,
                          borderRadius: 1,
                        }}
                        title={`${s.compound} · L${s.lapStart}-${s.lapEnd}`}
                      />
                    );
                  })}
                  {dp.map((p, i) => (
                    <div
                      key={`p${i}`}
                      className={cn('absolute -top-0.5 -bottom-0.5 w-px bg-white')}
                      style={{ left: lapPct(p.lapNumber) }}
                      title={`Pit · L${p.lapNumber}${p.duration ? ` · ${p.duration.toFixed(1)}s` : ''}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
