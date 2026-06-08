'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { DriverStanding } from '@/lib/types';
import { useStandings } from '@/hooks/useStandings';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { TeamColorAccent } from '@/components/ui/TeamColorAccent';

const SPRING = { type: 'spring' as const, stiffness: 120, damping: 20 };

function DriverRow({
  d,
  index,
  leaderPoints,
}: {
  d: DriverStanding;
  index: number;
  leaderPoints: number;
}) {
  const [hover, setHover] = useState(false);
  const pct = leaderPoints > 0 ? (d.points / leaderPoints) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: Math.min(index * 0.02, 0.3) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="grid items-center gap-2 px-2 h-9 border-b border-border last:border-b-0"
      style={{
        gridTemplateColumns: '28px 1fr 110px 84px 40px 56px',
        backgroundColor: hover ? `${d.color}14` : 'transparent',
      }}
    >
      <span className="mono text-[12px] text-muted tabular-nums text-right pr-1">{d.position}</span>

      <div className="flex items-center gap-2 min-w-0">
        <TeamColorAccent color={d.color} width={3} className="h-4" />
        <span className="font-sans text-[13px] text-white truncate">
          {d.givenName} {d.familyName}
        </span>
      </div>

      <span className="font-sans text-[11px] text-muted truncate">{d.team}</span>

      <div className="flex flex-col gap-1 justify-center">
        <span className="mono text-[12px] text-white tabular-nums leading-none">{d.points}</span>
        <div className="h-[4px] w-full bg-[#ffffff08]" style={{ borderRadius: 2 }}>
          <div
            className="h-full"
            style={{ width: `${pct}%`, backgroundColor: d.color, borderRadius: 2 }}
          />
        </div>
      </div>

      <span className="mono text-[12px] text-muted tabular-nums text-right pr-2">{d.wins}</span>
      <span className="mono text-[12px] text-muted tabular-nums text-right pr-2">{d.podiums}</span>
    </motion.div>
  );
}

export function DriverStandingsTable({ year }: { year: number }) {
  const { data, isLoading, isError } = useStandings(year);
  const drivers = data?.drivers ?? [];
  const leaderPoints = drivers.length ? Math.max(...drivers.map((d) => d.points)) : 0;

  return (
    <div className="panel flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-2 h-8 border-b border-border-strong shrink-0">
        <span className="label">Driver Standings</span>
        <div
          className="grid gap-2 items-center text-[9px] text-muted mono uppercase tracking-wider"
          style={{ gridTemplateColumns: '110px 84px 40px 56px' }}
        >
          <span>Team</span>
          <span>Pts</span>
          <span className="text-right pr-2">Win</span>
          <span className="text-right pr-2">Pod</span>
        </div>
      </div>

      <div className="flex flex-col">
        {isLoading ? (
          <div className="p-1">
            <SkeletonRows rows={20} height={32} />
          </div>
        ) : isError || drivers.length === 0 ? (
          <div className="px-3 py-6 mono text-[12px] text-muted">
            No standings available for {year}.
          </div>
        ) : (
          drivers.map((d, i) => (
            <DriverRow key={d.driverId} d={d} index={i} leaderPoints={leaderPoints} />
          ))
        )}
      </div>
    </div>
  );
}
