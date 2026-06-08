'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ConstructorStanding } from '@/lib/types';
import { useStandings } from '@/hooks/useStandings';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { TeamColorAccent } from '@/components/ui/TeamColorAccent';

const SPRING = { type: 'spring' as const, stiffness: 120, damping: 20 };

function ConstructorRow({
  c,
  index,
  leaderPoints,
}: {
  c: ConstructorStanding;
  index: number;
  leaderPoints: number;
}) {
  const [hover, setHover] = useState(false);
  const pct = leaderPoints > 0 ? (c.points / leaderPoints) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: Math.min(index * 0.03, 0.3) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="grid items-center gap-2 px-2 h-9 border-b border-border last:border-b-0"
      style={{
        gridTemplateColumns: '28px 1fr 96px 40px',
        backgroundColor: hover ? `${c.color}14` : 'transparent',
      }}
    >
      <span className="mono text-[12px] text-muted tabular-nums text-right pr-1">{c.position}</span>

      <div className="flex items-center gap-2 min-w-0">
        <TeamColorAccent color={c.color} width={3} className="h-4" />
        <span className="font-sans text-[13px] text-white truncate">{c.name}</span>
      </div>

      <div className="flex flex-col gap-1 justify-center">
        <span className="mono text-[12px] text-white tabular-nums leading-none">{c.points}</span>
        <div className="h-[4px] w-full bg-[#ffffff08]" style={{ borderRadius: 2 }}>
          <div
            className="h-full"
            style={{ width: `${pct}%`, backgroundColor: c.color, borderRadius: 2 }}
          />
        </div>
      </div>

      <span className="mono text-[12px] text-muted tabular-nums text-right pr-2">{c.wins}</span>
    </motion.div>
  );
}

export function ConstructorTable({ year }: { year: number }) {
  const { data, isLoading, isError } = useStandings(year);
  const constructors = data?.constructors ?? [];
  const leaderPoints = constructors.length
    ? Math.max(...constructors.map((c) => c.points))
    : 0;

  return (
    <div className="panel flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-2 h-8 border-b border-border-strong shrink-0">
        <span className="label">Constructor Standings</span>
        <div
          className="grid gap-2 items-center text-[9px] text-muted mono uppercase tracking-wider"
          style={{ gridTemplateColumns: '96px 40px' }}
        >
          <span>Pts</span>
          <span className="text-right pr-2">Win</span>
        </div>
      </div>

      <div className="flex flex-col">
        {isLoading ? (
          <div className="p-1">
            <SkeletonRows rows={10} height={32} />
          </div>
        ) : isError || constructors.length === 0 ? (
          <div className="px-3 py-6 mono text-[12px] text-muted">
            No standings available for {year}.
          </div>
        ) : (
          constructors.map((c, i) => (
            <ConstructorRow key={c.constructorId} c={c} index={i} leaderPoints={leaderPoints} />
          ))
        )}
      </div>
    </div>
  );
}
