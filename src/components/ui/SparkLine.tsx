'use client';

import { LineChart, Line, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { formatLapTime } from '@/lib/utils';

/**
 * Compact last-N-laps sparkline rendered with Recharts. Line is the driver's
 * team color. No axes/grid — just the trace and a value tooltip.
 */
export function SparkLine({
  data,
  color,
  height = 44,
}: {
  data: { lap: number; value: number }[];
  color: string;
  height?: number;
}) {
  if (!data.length) {
    return <div className="text-muted text-xs mono">no lap data</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
        <YAxis hide domain={['dataMin - 0.3', 'dataMax + 0.3']} />
        <Tooltip
          cursor={{ stroke: color, strokeWidth: 1, opacity: 0.4 }}
          contentStyle={{
            background: '#0f0f1a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2,
            fontFamily: 'var(--font-jetbrains)',
            fontSize: 11,
          }}
          labelFormatter={(l) => `Lap ${l}`}
          formatter={(v: number) => [formatLapTime(v), 'Lap time']}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={{ r: 2, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 3, fill: color }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
