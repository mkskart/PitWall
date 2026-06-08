'use client';

import { AnimatePresence } from 'framer-motion';
import { useRaceStore } from '@/store/raceStore';
import { DriverRow } from './DriverRow';
import { SkeletonRows } from '@/components/ui/Skeleton';

/**
 * Live timing tower. Subscribes only to the `order` array (which changes solely
 * on overtakes), then renders one DriverRow per driver. Each row owns its own
 * fine-grained subscription, so position-stream churn stays out of this list.
 */
export function TimingTower() {
  const order = useRaceStore((s) => s.order);

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-2 h-8 border-b border-border shrink-0">
        <span className="label">Live Timing</span>
        <div className="flex items-center gap-1 text-[9px] text-muted mono">
          <span className="w-5 text-center">POS</span>
          <span className="w-9">DRV</span>
          <span className="w-14">GAP</span>
          <span className="flex-1">LAST</span>
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
              <DriverRow key={num} driverNumber={num} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
