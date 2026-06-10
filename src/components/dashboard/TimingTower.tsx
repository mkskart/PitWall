'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRaceStore } from '@/store/raceStore';
import { DriverRow, type GapMode } from './DriverRow';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

/**
 * Live timing tower. Subscribes only to the `order` array (which changes solely
 * on overtakes), then renders one DriverRow per driver. Each row owns its own
 * fine-grained subscription, so position-stream churn stays out of this list.
 * The GAP/INT toggle switches between gap-to-leader and interval-to-car-ahead.
 */
export function TimingTower() {
  const order = useRaceStore((s) => s.order);
  const [gapMode, setGapMode] = useState<GapMode>('gap');

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-2 h-8 border-b border-border shrink-0">
        <span className="label">Live Timing</span>
        <div className="flex items-center gap-2">
          <div className="flex border border-border" style={{ borderRadius: 2 }}>
            {(['gap', 'interval'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setGapMode(m)}
                className={cn(
                  'mono text-[9px] px-1.5 py-0.5 uppercase transition-colors duration-150',
                  gapMode === m ? 'bg-[#ffffff14] text-white' : 'text-muted hover:text-white',
                )}
              >
                {m === 'gap' ? 'GAP' : 'INT'}
              </button>
            ))}
          </div>
          <div className="hidden xl:flex items-center gap-1 text-[9px] text-muted mono">
            <span className="w-5 text-center">POS</span>
            <span className="w-9">DRV</span>
            <span className="w-14">{gapMode === 'gap' ? 'GAP' : 'INT'}</span>
            <span>LAST</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-0.5">
        {order.length === 0 ? (
          <div className="p-1">
            <SkeletonRows rows={20} height={26} />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {order.map((num) => (
              <DriverRow key={num} driverNumber={num} gapMode={gapMode} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
