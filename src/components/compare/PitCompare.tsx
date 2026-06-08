'use client';

import { useMemo } from 'react';
import { COMPOUND_COLORS, COMPOUND_SHORT, type Lap, type PitStop, type Stint } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';
import type { PickerSelection } from './DriverPicker';
import { useStints, usePits, useLaps } from './useCompareData';

interface SideData {
  stints: Stint[];
  pits: PitStop[];
  laps: Lap[];
}

/**
 * Undercut heuristic (no live position data available from these endpoints):
 * For each pit stop by driver X on lap L, we flag UNDERCUT when
 *   1. the OTHER driver had NOT yet pitted by lap L (they were still out on older tyres), AND
 *   2. X's average pace over the 2 laps AFTER the stop is faster than the other
 *      driver's pace over those same lap numbers (fresh-tyre advantage realized).
 * This approximates "pitted earlier and gained on track". Documented as an
 * approximation — it does not assert an actual position change.
 */
function isUndercut(
  pitLap: number,
  self: SideData,
  other: SideData,
): boolean {
  const otherPittedBefore = other.pits.some((p) => p.lapNumber <= pitLap);
  if (otherPittedBefore) return false;

  const paceOver = (laps: Lap[], from: number, to: number): number | null => {
    const vals = laps
      .filter((l) => l.lapNumber > from && l.lapNumber <= to && l.lapDuration != null && l.lapDuration > 0 && !l.isPitOut)
      .map((l) => l.lapDuration as number);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const selfPace = paceOver(self.laps, pitLap, pitLap + 2);
  const otherPace = paceOver(other.laps, pitLap, pitLap + 2);
  if (selfPace == null || otherPace == null) return false;
  return selfPace < otherPace;
}

function filterSide(
  driverNumber: number,
  stints: Stint[],
  pits: PitStop[],
  laps: Lap[],
): SideData {
  return {
    stints: stints.filter((s) => s.driverNumber === driverNumber).sort((a, b) => a.lapStart - b.lapStart),
    pits: pits.filter((p) => p.driverNumber === driverNumber).sort((a, b) => a.lapNumber - b.lapNumber),
    laps,
  };
}

export function PitCompare({
  driverA,
  driverB,
}: {
  driverA: PickerSelection;
  driverB: PickerSelection;
}) {
  const stintsAQ = useStints(driverA.sessionKey);
  const pitsAQ = usePits(driverA.sessionKey);
  const lapsAQ = useLaps(driverA.sessionKey, driverA.driver.driverNumber);

  const sameSession = driverA.sessionKey === driverB.sessionKey;
  const stintsBQ = useStints(driverB.sessionKey);
  const pitsBQ = usePits(driverB.sessionKey);
  const lapsBQ = useLaps(driverB.sessionKey, driverB.driver.driverNumber);

  const loading =
    stintsAQ.isLoading || pitsAQ.isLoading || lapsAQ.isLoading || stintsBQ.isLoading || pitsBQ.isLoading || lapsBQ.isLoading;

  const { sideA, sideB, totalLaps } = useMemo(() => {
    const sideA = filterSide(
      driverA.driver.driverNumber,
      stintsAQ.data?.stints ?? [],
      pitsAQ.data?.pits ?? [],
      lapsAQ.data?.laps ?? [],
    );
    const sideB = filterSide(
      driverB.driver.driverNumber,
      stintsBQ.data?.stints ?? [],
      pitsBQ.data?.pits ?? [],
      lapsBQ.data?.laps ?? [],
    );
    const ends = [...sideA.stints, ...sideB.stints].map((s) => s.lapEnd);
    const lapMax = [...sideA.laps, ...sideB.laps].map((l) => l.lapNumber);
    const totalLaps = Math.max(1, ...ends, ...lapMax);
    return { sideA, sideB, totalLaps };
  }, [
    driverA.driver.driverNumber,
    driverB.driver.driverNumber,
    stintsAQ.data,
    pitsAQ.data,
    lapsAQ.data,
    stintsBQ.data,
    pitsBQ.data,
    lapsBQ.data,
  ]);

  if (loading) {
    return (
      <div className="panel p-3 flex flex-col gap-3">
        <Skeleton style={{ height: 56 }} />
        <Skeleton style={{ height: 56 }} />
      </div>
    );
  }

  const hasData = sideA.stints.length > 0 || sideB.stints.length > 0;
  if (!hasData) {
    return (
      <div className="panel flex items-center justify-center" style={{ height: 300 }}>
        <span className="text-muted text-sm font-sans">No stint / pit data available for this comparison.</span>
      </div>
    );
  }

  return (
    <div className="panel flex flex-col">
      <div className="flex items-center justify-between px-3 h-8 border-b border-border shrink-0">
        <span className="label">Pit Strategy</span>
        <span className="mono text-[10px] text-muted">{totalLaps} LAPS</span>
      </div>

      {!sameSession && (
        <div className="px-3 py-1.5 border-b border-border">
          <span className="text-[10px] text-[#FFD600] font-sans">
            Drivers are from different sessions — strategies are not directly comparable.
          </span>
        </div>
      )}

      <div className="p-3 flex flex-col gap-4">
        <StintRow sel={driverA} self={sideA} other={sideB} totalLaps={totalLaps} />
        <StintRow sel={driverB} self={sideB} other={sideA} totalLaps={totalLaps} />
      </div>

      {/* Lap-axis legend */}
      <div className="px-3 pb-3 flex justify-between mono text-[10px] text-muted">
        <span>L1</span>
        <span>L{Math.round(totalLaps / 2)}</span>
        <span>L{totalLaps}</span>
      </div>
    </div>
  );
}

function StintRow({
  sel,
  self,
  other,
  totalLaps,
}: {
  sel: PickerSelection;
  self: SideData;
  other: SideData;
  totalLaps: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="mono text-xs w-10" style={{ color: sel.driver.color }}>
          {sel.driver.code}
        </span>
        <span className="text-[10px] text-muted font-sans">
          {self.stints.length} stint{self.stints.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="relative h-7 bg-[#ffffff06]" style={{ borderRadius: 2 }}>
        {self.stints.map((s, i) => {
          const left = (Math.max(0, s.lapStart - 1) / totalLaps) * 100;
          const width = (Math.max(0, s.lapEnd - s.lapStart + 1) / totalLaps) * 100;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 flex items-center justify-center"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: COMPOUND_COLORS[s.compound],
                opacity: 0.85,
                borderRadius: 1,
              }}
              title={`${s.compound} · L${s.lapStart}-${s.lapEnd}`}
            >
              {width > 4 && (
                <span className="mono text-[10px] text-black/80 font-bold">{COMPOUND_SHORT[s.compound]}</span>
              )}
            </div>
          );
        })}

        {/* Pit ticks + undercut badges */}
        {self.pits.map((p, i) => {
          const leftPct = (Math.max(0, Math.min(totalLaps, p.lapNumber)) / totalLaps) * 100;
          const undercut = isUndercut(p.lapNumber, self, other);
          return (
            <div key={`pit${i}`} className="absolute -top-0.5 -bottom-0.5" style={{ left: `${leftPct}%` }}>
              <div className="w-px h-full bg-white" title={`Pit · L${p.lapNumber}${p.duration ? ` · ${p.duration.toFixed(1)}s` : ''}`} />
              {undercut && (
                <span
                  className="absolute -top-4 left-1/2 -translate-x-1/2 mono text-[8px] px-1 leading-tight whitespace-nowrap"
                  style={{ backgroundColor: '#27F4D2', color: '#080810', borderRadius: 1 }}
                >
                  UNDERCUT
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Pit stop durations */}
      {self.pits.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-12">
          {self.pits.map((p, i) => (
            <span key={i} className="mono text-[10px] text-muted">
              L{p.lapNumber}
              <span className="text-white ml-1">{p.duration != null ? `${p.duration.toFixed(1)}s` : '—'}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
