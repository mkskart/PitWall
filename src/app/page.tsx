'use client';

import dynamic from 'next/dynamic';
import { useLiveRace } from '@/hooks/useLiveRace';
import { TimingTower } from '@/components/dashboard/TimingTower';
import { DriverDetailPanel } from '@/components/dashboard/DriverDetailPanel';
import { PitStrategyTimeline } from '@/components/dashboard/PitStrategyTimeline';
import { useRaceStore } from '@/store/raceStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// R3F must render client-side only.
const TrackScene = dynamic(() => import('@/components/track/TrackScene').then((m) => m.TrackScene), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});

export default function DashboardPage() {
  useLiveRace();
  const session = useRaceStore((s) => s.session);
  const mode = useRaceStore((s) => s.mode);

  return (
    <div className="lg:h-[calc(100vh-3rem)] flex flex-col gap-2 p-2">
      <div className="flex items-center justify-between px-1 shrink-0">
        <div className="flex items-baseline gap-3">
          <h1 className="font-sans text-sm font-semibold text-white">
            {session ? `${session.circuitShortName}` : 'Dashboard'}
          </h1>
          <span className="label">
            {session ? `${session.country} · ${session.name}` : 'Awaiting session'}
          </span>
        </div>
        {mode === 'sim' && (
          <span className="mono text-[10px] text-[#FFD600] tracking-wide">
            ◆ SIMULATED RACE STATE — NOT LIVE DATA
          </span>
        )}
      </div>

      {/* three columns on desktop; stacked on mobile */}
      <div className="flex-1 grid gap-2 min-h-0 grid-cols-1 lg:[grid-template-columns:22%_1fr_26%]">
        <div className="min-h-0 h-[40vh] lg:h-auto order-2 lg:order-1">
          <ErrorBoundary label="Timing Tower">
            <TimingTower />
          </ErrorBoundary>
        </div>
        <div className="min-h-0 h-[40vh] lg:h-auto panel overflow-hidden relative order-1 lg:order-2">
          <ErrorBoundary label="Track Map">
            <TrackScene />
          </ErrorBoundary>
          <div className="absolute top-2 left-2 label pointer-events-none">Track Map</div>
        </div>
        <div className="min-h-0 order-3">
          <ErrorBoundary label="Driver Detail">
            <DriverDetailPanel />
          </ErrorBoundary>
        </div>
      </div>

      {/* bottom strip */}
      <div className="lg:h-[26%] h-[220px] lg:min-h-[160px] shrink-0">
        <ErrorBoundary label="Pit Strategy">
          <PitStrategyTimeline />
        </ErrorBoundary>
      </div>
    </div>
  );
}
