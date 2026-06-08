import { cn } from '@/lib/utils';
import { formatSector } from '@/lib/utils';

export type SectorTone = 'pb' | 'faster' | 'slower' | 'neutral';

const TONE_COLOR: Record<SectorTone, string> = {
  pb: '#9B59D0', // personal/overall best — purple
  faster: '#27F4D2', // green
  slower: '#FFD600', // yellow
  neutral: '#6b6b7b',
};

/**
 * Sector delta chip (S1 / S2 / S3). Tone encodes the standard F1 color
 * language: purple = best, green = faster than reference, yellow = slower.
 */
export function SectorChip({
  label,
  seconds,
  tone,
  className,
}: {
  label: string;
  seconds: number | null;
  tone: SectorTone;
  className?: string;
}) {
  const color = TONE_COLOR[tone];
  return (
    <div
      className={cn('flex items-center gap-1.5 px-2 py-1 border', className)}
      style={{
        borderRadius: 2,
        borderColor: `${color}40`,
        backgroundColor: `${color}14`,
      }}
    >
      <span className="label" style={{ color }}>
        {label}
      </span>
      <span className="mono text-xs tabular-nums" style={{ color }}>
        {formatSector(seconds)}
      </span>
    </div>
  );
}
