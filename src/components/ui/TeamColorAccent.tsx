import { cn } from '@/lib/utils';

/**
 * A vertical team-color accent bar. Used as the left edge of timing rows,
 * standings rows, and detail cards. The color is always a team color.
 */
export function TeamColorAccent({
  color,
  className,
  width = 3,
  glow = false,
}: {
  color: string;
  className?: string;
  width?: number;
  glow?: boolean;
}) {
  return (
    <span
      className={cn('block self-stretch shrink-0', className)}
      style={{
        width,
        backgroundColor: color,
        boxShadow: glow ? `0 0 8px ${color}` : undefined,
      }}
    />
  );
}
