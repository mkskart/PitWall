'use client';

import { motion } from 'framer-motion';
import { useLatestSession } from '@/hooks/useSessions';
import { useRaceStore, selectMode } from '@/store/raceStore';

/**
 * Header session pill. Three states, in priority order:
 *  - SIMULATION MODE  → the sim engine is currently driving the store
 *  - LIVE (pulsing)   → OpenF1 reports an in-progress session
 *  - NO ACTIVE SESSION (muted)
 */
export function LivePill() {
  const mode = useRaceStore(selectMode);
  const { data } = useLatestSession();
  const isLive = Boolean(data?.latest?.isLive);

  if (mode === 'sim') {
    return (
      <Pill color="#FFD600" dim>
        <span className="mono text-[11px] tracking-wide">SIMULATION MODE</span>
      </Pill>
    );
  }

  if (isLive) {
    return (
      <Pill color="#E8002D">
        <motion.span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: '#E8002D' }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="mono text-[11px] tracking-wide text-[#E8002D]">LIVE</span>
        <span className="font-sans text-[11px] text-muted">{data?.latest?.circuitShortName}</span>
      </Pill>
    );
  }

  return (
    <Pill color="#3a3a48" dim>
      <span className="mono text-[11px] tracking-wide text-muted">NO ACTIVE SESSION</span>
    </Pill>
  );
}

function Pill({ children, color, dim }: { children: React.ReactNode; color: string; dim?: boolean }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 border"
      style={{
        borderRadius: 2,
        borderColor: dim ? 'rgba(255,255,255,0.1)' : `${color}66`,
        backgroundColor: dim ? 'transparent' : `${color}14`,
        boxShadow: dim ? undefined : `0 0 14px ${color}33`,
      }}
    >
      {children}
    </div>
  );
}
