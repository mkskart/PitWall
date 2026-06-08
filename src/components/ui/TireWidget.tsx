'use client';

import { motion } from 'framer-motion';
import { COMPOUND_COLORS, COMPOUND_SHORT, type Compound } from '@/lib/types';
import { degradation, optimalLife } from '@/lib/tireDeg';

/**
 * Tire compound badge + degradation bar. The bar fills as the stint ages,
 * scaled by the compound's optimal life, and shifts toward red as it depletes.
 * Soft degrades fastest, hard slowest (curves in lib/tireDeg.ts).
 */
export function TireWidget({ compound, age }: { compound: Compound; age: number }) {
  const color = COMPOUND_COLORS[compound];
  const wear = degradation(compound, age); // 0 fresh → 1 worn
  const life = optimalLife(compound);
  const remaining = 1 - wear;

  return (
    <div className="flex items-center gap-3">
      <CompoundBadge compound={compound} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="label">Tyre Life</span>
          <span className="mono text-[11px] text-muted tabular-nums">
            {age}/{life} laps
          </span>
        </div>
        <div className="h-1.5 w-full bg-[#ffffff0a]" style={{ borderRadius: 2 }}>
          <motion.div
            className="h-full"
            style={{ borderRadius: 2, backgroundColor: wear > 0.7 ? '#FF3333' : color }}
            animate={{ width: `${Math.max(4, remaining * 100)}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </div>
    </div>
  );
}

export function CompoundBadge({ compound, size = 28 }: { compound: Compound; size?: number }) {
  const color = COMPOUND_COLORS[compound];
  return (
    <div
      className="flex items-center justify-center shrink-0 font-mono font-bold"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        color,
        fontSize: size * 0.42,
        boxShadow: `0 0 8px ${color}55`,
      }}
      title={compound}
    >
      {COMPOUND_SHORT[compound]}
    </div>
  );
}
