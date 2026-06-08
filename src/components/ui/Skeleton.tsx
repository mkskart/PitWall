import { cn } from '@/lib/utils';

/**
 * Pulsing skeleton placeholder. We never use spinners — loading states hold
 * the exact final dimensions to avoid layout shift.
 */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn('animate-skeleton-pulse bg-[#ffffff08]', className)}
      style={{ borderRadius: 2, ...style }}
    />
  );
}

export function SkeletonRows({ rows = 20, height = 28 }: { rows?: number; height?: number }) {
  return (
    <div className="flex flex-col gap-px">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} style={{ height }} />
      ))}
    </div>
  );
}
