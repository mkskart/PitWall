'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';
import type { Lap } from '@/lib/types';
import { formatLapTime, formatDelta } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import type { PickerSelection } from './DriverPicker';
import { useLaps, cleanLaps } from './useCompareData';

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#0f0f1a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 2,
  fontFamily: 'var(--font-jetbrains)',
  fontSize: 11,
};
const AXIS_TICK = { fill: '#6b6b7b', fontSize: 10, fontFamily: 'var(--font-jetbrains)' };

interface ChartRow {
  lap: number;
  a: number | null;
  b: number | null;
}

function fastestLap(laps: Lap[]): Lap | null {
  let best: Lap | null = null;
  for (const l of laps) {
    if (l.lapDuration == null) continue;
    if (!best || (l.lapDuration as number) < (best.lapDuration as number)) best = l;
  }
  return best;
}

export function LapTimeChart({
  driverA,
  driverB,
}: {
  driverA: PickerSelection;
  driverB: PickerSelection;
}) {
  const lapsAQ = useLaps(driverA.sessionKey, driverA.driver.driverNumber);
  const lapsBQ = useLaps(driverB.sessionKey, driverB.driver.driverNumber);

  const loading = lapsAQ.isLoading || lapsBQ.isLoading;

  const { rows, fastA, fastB } = useMemo(() => {
    const a = cleanLaps(lapsAQ.data?.laps ?? []);
    const b = cleanLaps(lapsBQ.data?.laps ?? []);
    const byLapA = new Map(a.map((l) => [l.lapNumber, l.lapDuration as number]));
    const byLapB = new Map(b.map((l) => [l.lapNumber, l.lapDuration as number]));
    const lapNums = new Set<number>([...byLapA.keys(), ...byLapB.keys()]);
    const rows: ChartRow[] = [...lapNums]
      .sort((x, y) => x - y)
      .map((lap) => ({
        lap,
        a: byLapA.get(lap) ?? null,
        b: byLapB.get(lap) ?? null,
      }));
    return { rows, fastA: fastestLap(a), fastB: fastestLap(b) };
  }, [lapsAQ.data, lapsBQ.data]);

  const colorA = driverA.driver.color;
  const colorB = driverB.driver.color;

  if (loading) {
    return (
      <div className="panel p-3">
        <Skeleton style={{ height: 360, width: '100%' }} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="panel flex items-center justify-center" style={{ height: 400 }}>
        <span className="text-muted text-sm font-sans">No lap data available for this comparison.</span>
      </div>
    );
  }

  return (
    <div className="panel flex flex-col">
      <div className="flex items-center justify-between px-3 h-8 border-b border-border shrink-0">
        <span className="label">Lap Times</span>
        <div className="flex items-center gap-4">
          <Legend color={colorA} code={driverA.driver.code} best={fastA?.lapDuration ?? null} />
          <Legend color={colorB} code={driverB.driver.code} best={fastB?.lapDuration ?? null} />
        </div>
      </div>
      <div className="p-3" style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
            <CartesianGrid stroke="#ffffff10" />
            <XAxis
              dataKey="lap"
              tick={AXIS_TICK}
              stroke="#ffffff20"
              label={{ value: 'LAP', position: 'insideBottomRight', offset: -4, fill: '#6b6b7b', fontSize: 9 }}
            />
            <YAxis
              tick={AXIS_TICK}
              stroke="#ffffff20"
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
              width={56}
              tickFormatter={(v: number) => formatLapTime(v)}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: '#e7e7ee' }}
              content={<LapTooltip codeA={driverA.driver.code} codeB={driverB.driver.code} colorA={colorA} colorB={colorB} />}
            />
            <Line
              type="monotone"
              dataKey="a"
              name={driverA.driver.code}
              stroke={colorA}
              strokeWidth={1.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="b"
              name={driverB.driver.code}
              stroke={colorB}
              strokeWidth={1.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            {fastA?.lapDuration != null && (
              <ReferenceDot x={fastA.lapNumber} y={fastA.lapDuration} r={5} fill={colorA} stroke="#080810" strokeWidth={1} />
            )}
            {fastB?.lapDuration != null && (
              <ReferenceDot x={fastB.lapNumber} y={fastB.lapDuration} r={5} fill={colorB} stroke="#080810" strokeWidth={1} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Legend({ color, code, best }: { color: string; code: string; best: number | null }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block w-3 h-[2px]" style={{ backgroundColor: color }} />
      <span className="mono text-[10px]" style={{ color }}>
        {code}
      </span>
      <span className="mono text-[10px] text-muted">{formatLapTime(best)}</span>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: number | string;
  payload?: { dataKey: string; value: number | null }[];
  codeA: string;
  codeB: string;
  colorA: string;
  colorB: string;
}

function LapTooltip({ active, label, payload, codeA, codeB, colorA, colorB }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const a = payload.find((p) => p.dataKey === 'a')?.value ?? null;
  const b = payload.find((p) => p.dataKey === 'b')?.value ?? null;
  const delta = a != null && b != null ? a - b : null;
  return (
    <div style={TOOLTIP_STYLE} className="px-2 py-1.5">
      <div className="text-[10px] text-muted mb-1">LAP {label}</div>
      <Row color={colorA} code={codeA} value={a} />
      <Row color={colorB} code={codeB} value={b} />
      {delta != null && (
        <div className="text-[10px] text-muted mt-1 pt-1 border-t border-white/10">
          Δ {formatDelta(delta)}
        </div>
      )}
    </div>
  );
}

function Row({ color, code, value }: { color: string; code: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span style={{ color }}>{code}</span>
      <span className="text-white tabular-nums">{formatLapTime(value)}</span>
    </div>
  );
}
