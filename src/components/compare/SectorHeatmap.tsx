'use client';

import { useMemo } from 'react';
import type { Lap } from '@/lib/types';
import { formatSector } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { SectorChip } from '@/components/ui/SectorChip';
import type { PickerSelection } from './DriverPicker';
import { useLaps } from './useCompareData';

// Heatmap color language.
const C_OVERALL = '#9B59D0'; // overall fastest (across both drivers) for this sector
const C_PB = '#27F4D2'; // that driver's personal best for the sector
const C_OK = '#FFD600'; // slower
const C_LOSS = '#FF3333'; // significant loss (> 1.5% slower than sector overall best)

type SectorKey = 'sector1' | 'sector2' | 'sector3';
const SECTORS: { key: SectorKey; label: string }[] = [
  { key: 'sector1', label: 'S1' },
  { key: 'sector2', label: 'S2' },
  { key: 'sector3', label: 'S3' },
];

interface DriverSectors {
  laps: Lap[];
  pb: Record<SectorKey, number | null>; // personal best per sector
  total: Record<SectorKey, number | null>; // best-sector aggregate (theoretical)
}

function analyze(laps: Lap[]): DriverSectors {
  const pb: Record<SectorKey, number | null> = { sector1: null, sector2: null, sector3: null };
  for (const l of laps) {
    for (const { key } of SECTORS) {
      const v = l[key];
      if (v != null && v > 0 && (pb[key] == null || v < (pb[key] as number))) pb[key] = v;
    }
  }
  return { laps, pb, total: pb };
}

function cellColor(value: number | null, driverPb: number | null, overallBest: number | null): string {
  if (value == null || value <= 0) return '#ffffff06';
  if (overallBest != null && value <= overallBest + 1e-6) return C_OVERALL;
  if (driverPb != null && value <= driverPb + 1e-6) return C_PB;
  if (overallBest != null && value > overallBest * 1.015) return C_LOSS;
  return C_OK;
}

export function SectorHeatmap({
  driverA,
  driverB,
}: {
  driverA: PickerSelection;
  driverB: PickerSelection;
}) {
  const lapsAQ = useLaps(driverA.sessionKey, driverA.driver.driverNumber);
  const lapsBQ = useLaps(driverB.sessionKey, driverB.driver.driverNumber);
  const loading = lapsAQ.isLoading || lapsBQ.isLoading;

  const { dataA, dataB, overall } = useMemo(() => {
    const a = analyze(lapsAQ.data?.laps ?? []);
    const b = analyze(lapsBQ.data?.laps ?? []);
    const overall: Record<SectorKey, number | null> = { sector1: null, sector2: null, sector3: null };
    for (const { key } of SECTORS) {
      const vals = [a.pb[key], b.pb[key]].filter((v): v is number => v != null);
      overall[key] = vals.length ? Math.min(...vals) : null;
    }
    return { dataA: a, dataB: b, overall };
  }, [lapsAQ.data, lapsBQ.data]);

  if (loading) {
    return (
      <div className="panel p-3 flex flex-col gap-3">
        <Skeleton style={{ height: 90 }} />
        <Skeleton style={{ height: 90 }} />
      </div>
    );
  }

  const hasData = dataA.laps.length > 0 || dataB.laps.length > 0;
  if (!hasData) {
    return (
      <div className="panel flex items-center justify-center" style={{ height: 300 }}>
        <span className="text-muted text-sm font-sans">No sector data available for this comparison.</span>
      </div>
    );
  }

  return (
    <div className="panel flex flex-col">
      <div className="flex items-center justify-between px-3 h-8 border-b border-border shrink-0">
        <span className="label">Sector Heatmap</span>
        <LegendKey />
      </div>

      {/* Theoretical-best summary with delta chips */}
      <div className="px-3 py-3 border-b border-border grid grid-cols-2 gap-4">
        <SummaryColumn data={dataA} overall={overall} sel={driverA} />
        <SummaryColumn data={dataB} overall={overall} sel={driverB} />
      </div>

      <div className="p-3 flex flex-col gap-4">
        <HeatGrid data={dataA} overall={overall} sel={driverA} />
        <HeatGrid data={dataB} overall={overall} sel={driverB} />
      </div>
    </div>
  );
}

function SummaryColumn({
  data,
  overall,
  sel,
}: {
  data: DriverSectors;
  overall: Record<SectorKey, number | null>;
  sel: PickerSelection;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="mono text-xs" style={{ color: sel.driver.color }}>
        {sel.driver.code}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {SECTORS.map(({ key, label }) => {
          const v = data.pb[key];
          const best = overall[key];
          let tone: 'pb' | 'faster' | 'slower' | 'neutral' = 'neutral';
          if (v != null && best != null) {
            if (v <= best + 1e-6) tone = 'pb';
            else tone = 'slower';
          }
          return <SectorChip key={key} label={label} seconds={v} tone={tone} />;
        })}
      </div>
    </div>
  );
}

function HeatGrid({
  data,
  overall,
  sel,
}: {
  data: DriverSectors;
  overall: Record<SectorKey, number | null>;
  sel: PickerSelection;
}) {
  // Use laps that have at least one valid sector; sort by lap number.
  const laps = useMemo(
    () =>
      data.laps
        .filter((l) => l.sector1 || l.sector2 || l.sector3)
        .sort((a, b) => a.lapNumber - b.lapNumber),
    [data.laps],
  );

  if (laps.length === 0) {
    return (
      <div>
        <span className="mono text-xs" style={{ color: sel.driver.color }}>
          {sel.driver.code}
        </span>
        <div className="text-muted text-xs mt-1">No sector laps.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="mono text-xs" style={{ color: sel.driver.color }}>
          {sel.driver.code}
        </span>
        <span className="text-[10px] text-muted font-sans">{laps.length} laps</span>
      </div>
      <div className="flex flex-col gap-px">
        {SECTORS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1">
            <span className="label w-5 shrink-0">{label}</span>
            <div className="flex gap-px flex-1 overflow-x-auto">
              {laps.map((l) => {
                const v = l[key];
                const bg = cellColor(v, data.pb[key], overall[key]);
                return (
                  <div
                    key={l.lapNumber}
                    className="h-3.5 flex-1"
                    style={{ backgroundColor: bg, minWidth: 4, borderRadius: 1 }}
                    title={`L${l.lapNumber} ${label} ${formatSector(v)}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendKey() {
  const items: [string, string][] = [
    [C_OVERALL, 'Overall'],
    [C_PB, 'PB'],
    [C_OK, 'Slower'],
    [C_LOSS, 'Loss'],
  ];
  return (
    <div className="flex items-center gap-2.5">
      {items.map(([color, name]) => (
        <span key={name} className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5" style={{ backgroundColor: color, borderRadius: 1 }} />
          <span className="label">{name}</span>
        </span>
      ))}
    </div>
  );
}
