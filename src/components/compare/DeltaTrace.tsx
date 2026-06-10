'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { PickerSelection } from './DriverPicker';
import { useLaps, cleanLaps } from './useCompareData';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDelta } from '@/lib/utils';

interface Point {
  lap: number;
  delta: number; // cumulative (A − B): positive = A behind, negative = A ahead
  ahead: number | null; // delta when A ahead (≤0) for the A-colored area
  behind: number | null; // delta when A behind (≥0) for the B-colored area
}

/**
 * The hero chart: cumulative race-time delta between the two drivers,
 * lap by lap. The zero line is "side by side"; the area is tinted toward
 * whichever driver is ahead, in their team color.
 */
export function DeltaTrace({ driverA, driverB }: { driverA: PickerSelection; driverB: PickerSelection }) {
  const a = useLaps(driverA.sessionKey, driverA.driver.driverNumber);
  const b = useLaps(driverB.sessionKey, driverB.driver.driverNumber);
  const loading = a.isLoading || b.isLoading;

  const data = useMemo<Point[]>(() => {
    const lapsA = cleanLaps(a.data?.laps ?? []);
    const lapsB = cleanLaps(b.data?.laps ?? []);
    if (!lapsA.length || !lapsB.length) return [];
    const byLapA = new Map(lapsA.map((l) => [l.lapNumber, l.lapDuration as number]));
    const byLapB = new Map(lapsB.map((l) => [l.lapNumber, l.lapDuration as number]));
    const common = [...byLapA.keys()].filter((n) => byLapB.has(n)).sort((x, y) => x - y);
    let cum = 0;
    return common.map((lap) => {
      cum += (byLapA.get(lap) as number) - (byLapB.get(lap) as number);
      const delta = Math.round(cum * 1000) / 1000;
      return { lap, delta, ahead: delta <= 0 ? delta : 0, behind: delta >= 0 ? delta : 0 };
    });
  }, [a.data, b.data]);

  if (loading) return <Skeleton style={{ height: 340 }} />;
  if (data.length < 2) {
    return (
      <div className="panel flex items-center justify-center" style={{ height: 340 }}>
        <span className="text-muted text-xs mono">Not enough common laps for a delta trace.</span>
      </div>
    );
  }

  const colorA = driverA.driver.color;
  const colorB = driverB.driver.color;

  return (
    <div className="panel p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="label">Race Delta — cumulative gap, lap by lap</span>
        <div className="flex items-center gap-3 mono text-[10px]">
          <span style={{ color: colorA }}>▼ {driverA.driver.code} ahead</span>
          <span style={{ color: colorB }}>▲ {driverB.driver.code} ahead</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#ffffff0a" vertical={false} />
          <XAxis
            dataKey="lap"
            tick={{ fill: '#6b6b7b', fontSize: 10, fontFamily: 'var(--font-jetbrains)' }}
            tickLine={false}
            axisLine={{ stroke: '#ffffff1a' }}
            label={undefined}
          />
          <YAxis
            tick={{ fill: '#6b6b7b', fontSize: 10, fontFamily: 'var(--font-jetbrains)' }}
            tickLine={false}
            axisLine={false}
            width={46}
            tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}s`}
          />
          <Tooltip
            contentStyle={{
              background: '#0f0f1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2,
              fontFamily: 'var(--font-jetbrains)',
              fontSize: 11,
            }}
            labelFormatter={(l) => `Lap ${l}`}
            formatter={(v: number) => [
              `${formatDelta(v)}s — ${v <= 0 ? driverA.driver.code : driverB.driver.code} ahead`,
              'Δ',
            ]}
          />
          <ReferenceLine y={0} stroke="#ffffff40" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="ahead"
            stroke={colorA}
            strokeWidth={1.5}
            fill={colorA}
            fillOpacity={0.18}
            isAnimationActive={false}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="behind"
            stroke={colorB}
            strokeWidth={1.5}
            fill={colorB}
            fillOpacity={0.18}
            isAnimationActive={false}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
