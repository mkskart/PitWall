'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useRaceStore } from '@/store/raceStore';
import { COMPOUND_COLORS, COMPOUND_SHORT } from '@/lib/types';
import { formatGap, formatLapTime, cn } from '@/lib/utils';

export type GapMode = 'gap' | 'interval';

/**
 * A single timing-tower row. It subscribes only to its own car's *displayed*
 * fields via a shallow-compared selector (gap is rounded), so a 60fps position
 * stream does not re-render the row — it updates only when the visible numbers
 * actually change. Vertical reordering is animated by Framer Motion `layout`.
 * A new personal-best lap flashes the row green for 800ms.
 */
function DriverRowBase({ driverNumber, gapMode }: { driverNumber: number; gapMode: GapMode }) {
  const driver = useRaceStore((s) => s.driversByNumber[driverNumber]);
  const selected = useRaceStore((s) => s.selectedDriver === driverNumber);
  const select = useRaceStore((s) => s.selectDriver);

  const data = useRaceStore(
    useShallow((s) => {
      const c = s.cars[driverNumber];
      // Interval = own gap minus the gap of the car directly ahead.
      let interval: number | null = null;
      if (c && c.gapToLeader != null && c.position > 1) {
        const ahead = s.order[c.position - 2];
        const aheadGap = ahead != null ? s.cars[ahead]?.gapToLeader : null;
        if (aheadGap != null) interval = Math.max(0, c.gapToLeader - aheadGap);
      }
      return {
        position: c?.position ?? 0,
        gap: c?.gapToLeader != null ? Math.round(c.gapToLeader * 10) / 10 : null,
        interval: interval != null ? Math.round(interval * 10) / 10 : c?.position === 1 ? 0 : null,
        lastLap: c?.lastLap ?? null,
        bestLap: c?.bestLap ?? null,
        compound: c?.compound ?? 'UNKNOWN',
        drs: c?.drs ?? false,
      };
    }),
  );

  // Flash on improvement: when a newly-set lap equals the personal best.
  const [flash, setFlash] = useState(false);
  const prevLast = useRef<number | null>(null);
  useEffect(() => {
    if (
      data.lastLap != null &&
      data.lastLap !== prevLast.current &&
      prevLast.current != null &&
      data.bestLap != null &&
      data.lastLap <= data.bestLap
    ) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 800);
      return () => clearTimeout(t);
    }
    prevLast.current = data.lastLap;
  }, [data.lastLap, data.bestLap]);
  useEffect(() => {
    prevLast.current = data.lastLap;
  }, [data.lastLap]);

  if (!driver) return null;
  const compoundColor = COMPOUND_COLORS[data.compound];
  const shown = gapMode === 'gap' ? data.gap : data.interval;

  return (
    <motion.button
      layout
      onClick={() => select(selected ? null : driverNumber)}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className={cn(
        'group flex items-center gap-2 h-7 w-full pl-0 pr-2 text-left border-l-2 transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-white/40',
        selected ? 'bg-[#ffffff0c]' : 'hover:bg-[#ffffff06]',
      )}
      style={{
        borderLeftColor: driver.color,
        boxShadow: selected ? `inset 0 0 18px ${driver.color}22` : undefined,
        backgroundColor: flash ? '#27F4D21f' : undefined,
      }}
    >
      <span className="mono text-[12px] w-5 text-center text-white tabular-nums">{data.position || '–'}</span>
      <span className="mono text-[12px] font-semibold w-9" style={{ color: driver.color }}>
        {driver.code}
      </span>
      <span className="mono text-[11px] text-muted w-14 tabular-nums">{formatGap(shown)}</span>
      <span
        className="mono text-[11px] flex-1 tabular-nums transition-colors duration-150"
        style={{ color: flash ? '#27F4D2' : '#cfcfe0' }}
      >
        {formatLapTime(data.lastLap)}
      </span>
      <span
        className="mono text-[10px] font-bold w-4 text-center"
        style={{ color: compoundColor }}
        title={data.compound}
      >
        {COMPOUND_SHORT[data.compound]}
      </span>
      <span
        className="mono text-[9px] w-7 text-center"
        style={{
          color: data.drs ? '#27F4D2' : '#3a3a48',
          textShadow: data.drs ? '0 0 6px #27F4D2' : undefined,
        }}
      >
        DRS
      </span>
    </motion.button>
  );
}

export const DriverRow = memo(DriverRowBase);
