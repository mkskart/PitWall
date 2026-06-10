'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { DriverPicker, type PickerSelection } from '@/components/compare/DriverPicker';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

// Each tab is code-split so the Recharts bundle loads only when a comparison
// is actually rendered; the initial page is just the pickers.
const tabFallback = () => <Skeleton style={{ height: 340 }} />;
const DeltaTrace = dynamic(() => import('@/components/compare/DeltaTrace').then((m) => m.DeltaTrace), { loading: tabFallback });
const LapTimeChart = dynamic(() => import('@/components/compare/LapTimeChart').then((m) => m.LapTimeChart), { loading: tabFallback });
const TelemetryOverlay = dynamic(() => import('@/components/compare/TelemetryOverlay').then((m) => m.TelemetryOverlay), { loading: tabFallback });
const SectorHeatmap = dynamic(() => import('@/components/compare/SectorHeatmap').then((m) => m.SectorHeatmap), { loading: tabFallback });
const PitCompare = dynamic(() => import('@/components/compare/PitCompare').then((m) => m.PitCompare), { loading: tabFallback });

const TABS = [
  { id: 'delta', label: 'Race Delta' },
  { id: 'laps', label: 'Lap Times' },
  { id: 'telemetry', label: 'Telemetry' },
  { id: 'sectors', label: 'Sectors' },
  { id: 'pit', label: 'Pit Strategy' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const SPRING = { type: 'spring', stiffness: 120, damping: 20 } as const;

export default function ComparePage() {
  const [driverA, setDriverA] = useState<PickerSelection | null>(null);
  const [driverB, setDriverB] = useState<PickerSelection | null>(null);
  const [tab, setTab] = useState<TabId>('delta');

  const bothPicked = driverA != null && driverB != null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col gap-6">
      <div>
        <h1 className="font-sans text-lg text-white">Head-to-Head</h1>
        <p className="text-xs text-muted font-sans mt-0.5">
          Compare two drivers across lap times, telemetry, sectors, and strategy. OpenF1 era (2023+).
        </p>
      </div>

      {/* Driver pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DriverPicker label="Driver A" value={driverA} onChange={setDriverA} />
        <DriverPicker label="Driver B" value={driverB} onChange={setDriverB} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative px-3 py-2 text-xs font-sans transition-colors',
                active ? 'text-white' : 'text-muted hover:text-white/80',
              )}
            >
              {t.label}
              {active && (
                <motion.span
                  layoutId="compare-tab-underline"
                  className="absolute left-0 right-0 -bottom-px h-0.5 bg-white"
                  transition={SPRING}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {!bothPicked ? (
        <div className="panel flex items-center justify-center" style={{ height: 320 }}>
          <span className="text-muted text-sm font-sans">Select two drivers to compare.</span>
        </div>
      ) : (
        <ErrorBoundary label="Comparison">
          {tab === 'delta' && <DeltaTrace driverA={driverA} driverB={driverB} />}
          {tab === 'laps' && <LapTimeChart driverA={driverA} driverB={driverB} />}
          {tab === 'telemetry' && <TelemetryOverlay driverA={driverA} driverB={driverB} />}
          {tab === 'sectors' && <SectorHeatmap driverA={driverA} driverB={driverB} />}
          {tab === 'pit' && <PitCompare driverA={driverA} driverB={driverB} />}
        </ErrorBoundary>
      )}
    </div>
  );
}
