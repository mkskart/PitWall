'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TelemetrySample } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';
import type { PickerSelection } from './DriverPicker';
import { useLaps, useTelemetry, cleanLaps } from './useCompareData';

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#0f0f1a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 2,
  fontFamily: 'var(--font-jetbrains)',
  fontSize: 11,
};
const AXIS_TICK = { fill: '#6b6b7b', fontSize: 10, fontFamily: 'var(--font-jetbrains)' };

interface MergedRow {
  distance: number;
  aSpeed?: number;
  bSpeed?: number;
  aThrottle?: number;
  bThrottle?: number;
  aBrake?: number;
  bBrake?: number;
  aGear?: number;
  bGear?: number;
}

/** Build a sorted, merged distance axis from two sample sets via nearest-distance binning. */
function mergeSamples(a: TelemetrySample[], b: TelemetrySample[]): MergedRow[] {
  const map = new Map<number, MergedRow>();
  const bin = (d: number) => Math.round(d / 10) * 10; // 10m buckets
  for (const s of a) {
    const d = bin(s.distance);
    const row = map.get(d) ?? { distance: d };
    row.aSpeed = s.speed;
    row.aThrottle = s.throttle;
    row.aBrake = s.brake;
    row.aGear = s.gear;
    map.set(d, row);
  }
  for (const s of b) {
    const d = bin(s.distance);
    const row = map.get(d) ?? { distance: d };
    row.bSpeed = s.speed;
    row.bThrottle = s.throttle;
    row.bBrake = s.brake;
    row.bGear = s.gear;
    map.set(d, row);
  }
  return [...map.values()].sort((x, y) => x.distance - y.distance);
}

/** Per-side lap selector populated from valid (racing) laps. */
function useLapOptions(sessionKey: number, driverNumber: number) {
  const lapsQ = useLaps(sessionKey, driverNumber);
  const laps = useMemo(() => {
    const clean = cleanLaps(lapsQ.data?.laps ?? []);
    return clean.sort((a, b) => a.lapNumber - b.lapNumber);
  }, [lapsQ.data]);
  const fastest = useMemo(() => {
    let best: number | null = null;
    let bestLap: number | null = null;
    for (const l of laps) {
      if (l.lapDuration == null) continue;
      if (best == null || l.lapDuration < best) {
        best = l.lapDuration;
        bestLap = l.lapNumber;
      }
    }
    return bestLap;
  }, [laps]);
  return { laps, fastest, isLoading: lapsQ.isLoading };
}

export function TelemetryOverlay({
  driverA,
  driverB,
}: {
  driverA: PickerSelection;
  driverB: PickerSelection;
}) {
  const optsA = useLapOptions(driverA.sessionKey, driverA.driver.driverNumber);
  const optsB = useLapOptions(driverB.sessionKey, driverB.driver.driverNumber);

  const [lapA, setLapA] = useState<number | null>(null);
  const [lapB, setLapB] = useState<number | null>(null);

  // Default each side to its fastest lap once laps load.
  useEffect(() => {
    if (lapA == null && optsA.fastest != null) setLapA(optsA.fastest);
  }, [optsA.fastest, lapA]);
  useEffect(() => {
    if (lapB == null && optsB.fastest != null) setLapB(optsB.fastest);
  }, [optsB.fastest, lapB]);

  const telA = useTelemetry(driverA.sessionKey, driverA.driver.driverNumber, lapA);
  const telB = useTelemetry(driverB.sessionKey, driverB.driver.driverNumber, lapB);

  const rows = useMemo(
    () => mergeSamples(telA.data?.telemetry?.samples ?? [], telB.data?.telemetry?.samples ?? []),
    [telA.data, telB.data],
  );

  const colorA = driverA.driver.color;
  const colorB = driverB.driver.color;

  const telLoading =
    (lapA != null && telA.isLoading) || (lapB != null && telB.isLoading) || optsA.isLoading || optsB.isLoading;

  return (
    <div className="panel flex flex-col">
      <div className="flex items-center justify-between gap-3 px-3 h-10 border-b border-border shrink-0">
        <span className="label">Telemetry Overlay</span>
        <div className="flex items-center gap-4">
          <LapSelect
            color={colorA}
            code={driverA.driver.code}
            laps={optsA.laps.map((l) => l.lapNumber)}
            value={lapA}
            onChange={setLapA}
          />
          <LapSelect
            color={colorB}
            code={driverB.driver.code}
            laps={optsB.laps.map((l) => l.lapNumber)}
            value={lapB}
            onChange={setLapB}
          />
        </div>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {telLoading ? (
          <>
            <Skeleton style={{ height: 120 }} />
            <Skeleton style={{ height: 90 }} />
            <Skeleton style={{ height: 90 }} />
            <Skeleton style={{ height: 70 }} />
          </>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center text-muted text-sm font-sans" style={{ height: 300 }}>
            No telemetry available for the selected laps.
          </div>
        ) : (
          <>
            <TraceChart
              title="Speed (km/h)"
              rows={rows}
              keyA="aSpeed"
              keyB="bSpeed"
              colorA={colorA}
              colorB={colorB}
              height={140}
              kind="area"
            />
            <TraceChart
              title="Throttle (%)"
              rows={rows}
              keyA="aThrottle"
              keyB="bThrottle"
              colorA={colorA}
              colorB={colorB}
              height={100}
              domain={[0, 100]}
              kind="area"
            />
            <TraceChart
              title="Brake (%)"
              rows={rows}
              keyA="aBrake"
              keyB="bBrake"
              colorA={colorA}
              colorB={colorB}
              height={100}
              domain={[0, 100]}
              kind="area"
            />
            <TraceChart
              title="Gear"
              rows={rows}
              keyA="aGear"
              keyB="bGear"
              colorA={colorA}
              colorB={colorB}
              height={90}
              domain={[0, 8]}
              kind="step"
              showXAxis
            />
          </>
        )}
      </div>
    </div>
  );
}

function LapSelect({
  color,
  code,
  laps,
  value,
  onChange,
}: {
  color: string;
  code: string;
  laps: number[];
  value: number | null;
  onChange: (lap: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="mono text-[10px]" style={{ color }}>
        {code}
      </span>
      <select
        className="bg-surface-2 border border-border-strong text-[11px] mono px-1.5 h-7 text-white outline-none focus:border-white/30 disabled:opacity-40"
        style={{ borderRadius: 2 }}
        value={value ?? ''}
        disabled={laps.length === 0}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {laps.length === 0 && <option value="">—</option>}
        {laps.map((l) => (
          <option key={l} value={l}>
            L{l}
          </option>
        ))}
      </select>
    </label>
  );
}

function TraceChart({
  title,
  rows,
  keyA,
  keyB,
  colorA,
  colorB,
  height,
  domain,
  kind,
  showXAxis,
}: {
  title: string;
  rows: MergedRow[];
  keyA: keyof MergedRow;
  keyB: keyof MergedRow;
  colorA: string;
  colorB: string;
  height: number;
  domain?: [number, number];
  kind: 'area' | 'step';
  showXAxis?: boolean;
}) {
  const gradA = `grad-${String(keyA)}`;
  const gradB = `grad-${String(keyB)}`;
  return (
    <div>
      <span className="label">{title}</span>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {kind === 'area' ? (
            <AreaChart data={rows} syncId="telemetry" margin={{ top: 4, right: 12, bottom: showXAxis ? 4 : 0, left: 4 }}>
              <defs>
                <linearGradient id={gradA} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colorA} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={colorA} stopOpacity={0} />
                </linearGradient>
                <linearGradient id={gradB} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colorB} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={colorB} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#ffffff10" />
              <XAxis
                dataKey="distance"
                hide={!showXAxis}
                tick={AXIS_TICK}
                stroke="#ffffff20"
                tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
              />
              <YAxis tick={AXIS_TICK} stroke="#ffffff20" width={36} domain={domain ?? ['auto', 'auto']} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => `${v} m`} />
              <Area
                type="monotone"
                dataKey={keyA as string}
                stroke={colorA}
                strokeWidth={1.5}
                fill={`url(#${gradA})`}
                fillOpacity={0.15}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey={keyB as string}
                stroke={colorB}
                strokeWidth={1.5}
                fill={`url(#${gradB})`}
                fillOpacity={0.15}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </AreaChart>
          ) : (
            <LineChart data={rows} syncId="telemetry" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke="#ffffff10" />
              <XAxis
                dataKey="distance"
                hide={!showXAxis}
                tick={AXIS_TICK}
                stroke="#ffffff20"
                tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
              />
              <YAxis tick={AXIS_TICK} stroke="#ffffff20" width={36} domain={domain ?? ['auto', 'auto']} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => `${v} m`} />
              <Line type="stepAfter" dataKey={keyA as string} stroke={colorA} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
              <Line type="stepAfter" dataKey={keyB as string} stroke={colorB} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
