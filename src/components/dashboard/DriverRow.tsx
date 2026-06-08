'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useRaceStore } from '@/store/raceStore';
import { COMPOUND_COLORS, COMPOUND_SHORT } from '@/lib/types';
import { formatGap, formatLapTime, cn } from '@/lib/utils';

/**
 * A single timing-tower row. It subscribes only to its own car's *displayed*
 * fields via a shallow-compared selector (gap is rounded), so a 60fps position
 * stream does not re-render the row — it updates only when the visible numbers
 * actually change. Vertical reordering is animated by Framer Motion `layout`.
 */
function DriverRowBase({ driverNumber }: { driverNumber: number }) {
  const driver = useRaceStore((s) => s.driversByNumber[driverNumber]);
  const selected = useRaceStore((s) => s.selectedDriver === driverNumber);
  const select = useRaceStore((s) => s.selectDriver);

  const data = useRaceStore(
    useShallow((s) => {
      const c = s.cars[driverNumber];
      return {
        position: c?.position ?? 0,
        gap: c?.gapToLeader != null ? Math.round(c.gapToLeader * 10) / 10 : null,
        lastLap: c?.lastLap ?? null,
        compound: c?.compound ?? 'UNKNOWN',
        drs: c?.drs ?? false,
      };
    }),
  );

  if (!driver) return null;
  const compoundColor = COMPOUND_COLORS[data.compound];

  return (
    <motion.button
      layout
      onClick={() => select(selected ? null : driverNumber)}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className={cn(
        'group flex items-center gap-2 h-7 w-full pl-0 pr-2 text-left border-l-2 transition-colors',
        selected ? 'bg-[#ffffff0c]' : 'hover:bg-[#ffffff06]',
      )}
      style={{
        borderLeftColor: driver.color,
        boxShadow: selected ? `inset 0 0 18px ${driver.color}22` : undefined,
      }}
    >
      <span className="mono text-[12px] w-5 text-center text-white tabular-nums">{data.position || '–'}</span>
      <span className="mono text-[12px] font-semibold w-9" style={{ color: driver.color }}>
        {driver.code}
      </span>
      <span className="mono text-[11px] text-muted w-14 tabular-nums">{formatGap(data.gap)}</span>
      <span className="mono text-[11px] text-[#cfcfe0] flex-1 tabular-nums">{formatLapTime(data.lastLap)}</span>
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
