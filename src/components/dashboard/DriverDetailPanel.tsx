'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useRaceStore } from '@/store/raceStore';
import { TeamColorAccent } from '@/components/ui/TeamColorAccent';
import { SectorChip, type SectorTone } from '@/components/ui/SectorChip';
import { TireWidget } from '@/components/ui/TireWidget';
import { SparkLine } from '@/components/ui/SparkLine';
import { formatLapTime, formatDelta, deltaHex, formatGap } from '@/lib/utils';

/** Right-hand panel: top-3 summary by default, full telemetry when selected. */
export function DriverDetailPanel() {
  const selected = useRaceStore((s) => s.selectedDriver);
  return (
    <div className="panel h-full overflow-y-auto">
      <AnimatePresence mode="wait">
        {selected == null ? (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TopThree />
          </motion.div>
        ) : (
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          >
            <DriverDetail driverNumber={selected} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopThree() {
  const order = useRaceStore((s) => s.order);
  const top = order.slice(0, 3);
  return (
    <div>
      <div className="px-3 h-8 flex items-center border-b border-border">
        <span className="label">Podium Positions</span>
      </div>
      <div className="p-2 flex flex-col gap-2">
        {top.length === 0 && <span className="text-muted text-xs mono p-2">Awaiting data…</span>}
        {top.map((num, i) => (
          <SummaryCard key={num} driverNumber={num} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ driverNumber, rank }: { driverNumber: number; rank: number }) {
  const driver = useRaceStore((s) => s.driversByNumber[driverNumber]);
  const data = useRaceStore(
    useShallow((s) => {
      const c = s.cars[driverNumber];
      return { lastLap: c?.lastLap ?? null, gap: c?.gapToLeader ?? null };
    }),
  );
  const select = useRaceStore((s) => s.selectDriver);
  if (!driver) return null;
  return (
    <button
      onClick={() => select(driverNumber)}
      className="flex items-stretch gap-2 hairline border p-2 hover:bg-[#ffffff06] text-left"
      style={{ borderRadius: 2 }}
    >
      <TeamColorAccent color={driver.color} glow />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="mono text-sm" style={{ color: driver.color }}>
            P{rank} · {driver.code}
          </span>
          <span className="mono text-[11px] text-muted">{formatGap(data.gap)}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="font-sans text-[11px] text-muted">{driver.team}</span>
          <span className="mono text-[11px] text-[#cfcfe0]">{formatLapTime(data.lastLap)}</span>
        </div>
      </div>
    </button>
  );
}

function DriverDetail({ driverNumber }: { driverNumber: number }) {
  const driver = useRaceStore((s) => s.driversByNumber[driverNumber]);
  const car = useRaceStore(
    useShallow((s) => {
      const c = s.cars[driverNumber];
      return {
        lastLap: c?.lastLap ?? null,
        bestLap: c?.bestLap ?? null,
        speed: c?.speed ?? 0,
        throttle: c?.throttle ?? 0,
        brake: c?.brake ?? 0,
        drs: c?.drs ?? false,
        compound: c?.compound ?? ('UNKNOWN' as const),
        tyreAge: c?.tyreAge ?? 0,
        s1: c?.sector1 ?? null,
        s2: c?.sector2 ?? null,
        s3: c?.sector3 ?? null,
      };
    }),
  );

  const laps = useRaceStore((s) => s.laps);
  const spark = useMemo(() => {
    return laps
      .filter((l) => l.driverNumber === driverNumber && l.lapDuration)
      .slice(-5)
      .map((l) => ({ lap: l.lapNumber, value: l.lapDuration as number }));
  }, [laps, driverNumber]);

  const sectorTones = useMemo(() => deriveSectorTones(laps, driverNumber), [laps, driverNumber]);

  if (!driver) return null;
  const delta = car.lastLap != null && car.bestLap != null ? car.lastLap - car.bestLap : null;

  return (
    <div className="flex flex-col">
      {/* header */}
      <div className="flex items-stretch gap-3 p-3 border-b border-border">
        <TeamColorAccent color={driver.color} width={4} glow />
        <div>
          <div className="font-sans text-lg leading-tight font-semibold" style={{ color: driver.color }}>
            {driver.fullName}
          </div>
          <div className="font-sans text-[11px] text-muted">{driver.team}</div>
        </div>
        <div className="ml-auto mono text-3xl font-bold" style={{ color: driver.color }}>
          {driver.driverNumber}
        </div>
      </div>

      <div className="p-3 flex flex-col gap-4">
        {/* lap vs PB */}
        <div className="flex items-end justify-between">
          <div>
            <div className="label">Last Lap</div>
            <div className="mono text-2xl text-white">{formatLapTime(car.lastLap)}</div>
          </div>
          <div className="text-right">
            <div className="label">vs Best</div>
            <div className="mono text-lg" style={{ color: deltaHex(delta) }}>
              {formatDelta(delta)}
            </div>
          </div>
        </div>

        {/* sparkline */}
        <div>
          <div className="label mb-1">Last 5 Laps</div>
          <SparkLine data={spark} color={driver.color} />
        </div>

        {/* sector chips */}
        <div className="flex gap-2">
          <SectorChip label="S1" seconds={car.s1} tone={sectorTones[0]} className="flex-1 justify-center" />
          <SectorChip label="S2" seconds={car.s2} tone={sectorTones[1]} className="flex-1 justify-center" />
          <SectorChip label="S3" seconds={car.s3} tone={sectorTones[2]} className="flex-1 justify-center" />
        </div>

        {/* tire */}
        <TireWidget compound={car.compound} age={car.tyreAge} />

        {/* speed trap */}
        <div className="flex items-end justify-between">
          <div className="label">Speed</div>
          <div className="mono text-2xl" style={{ color: driver.color }}>
            {Math.round(car.speed)}
            <span className="text-sm text-muted ml-1">km/h</span>
          </div>
        </div>

        {/* throttle / brake */}
        <div className="flex flex-col gap-2">
          <Bar label="Throttle" value={car.throttle} color="#27F4D2" />
          <Bar label="Brake" value={car.brake} color="#FF3333" />
        </div>

        {/* DRS pill */}
        <div
          className="flex items-center justify-center h-8 mono text-xs tracking-wide"
          style={{
            border: `1px solid ${car.drs ? '#27F4D2' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 2,
            color: car.drs ? '#27F4D2' : '#6b6b7b',
            background: car.drs ? '#27F4D214' : 'transparent',
            boxShadow: car.drs ? '0 0 14px #27F4D244' : undefined,
          }}
        >
          {car.drs ? 'DRS OPEN' : 'DRS CLOSED'}
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="label">{label}</span>
        <span className="mono text-[11px] text-muted">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 bg-[#ffffff0a]" style={{ borderRadius: 2 }}>
        <motion.div
          className="h-full"
          style={{ backgroundColor: color, borderRadius: 2 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

/** Classify each of the latest sector times against the driver's own bests. */
function deriveSectorTones(
  laps: { driverNumber: number; sector1: number | null; sector2: number | null; sector3: number | null }[],
  driverNumber: number,
): [SectorTone, SectorTone, SectorTone] {
  const mine = laps.filter((l) => l.driverNumber === driverNumber);
  if (!mine.length) return ['neutral', 'neutral', 'neutral'];
  const cols: ('sector1' | 'sector2' | 'sector3')[] = ['sector1', 'sector2', 'sector3'];
  const last = mine[mine.length - 1];
  return cols.map((col) => {
    const values = mine.map((l) => l[col]).filter((v): v is number => v != null && v > 0);
    if (!values.length || last[col] == null) return 'neutral';
    const best = Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const v = last[col] as number;
    if (v <= best * 1.001) return 'pb';
    if (v < avg) return 'faster';
    return 'slower';
  }) as [SectorTone, SectorTone, SectorTone];
}
