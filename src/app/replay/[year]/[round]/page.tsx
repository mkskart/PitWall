'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useReplay } from '@/hooks/useReplay';
import { useSessionsForYear } from '@/hooks/useSessions';
import { ReplayControls } from '@/components/replay/ReplayControls';
import { DriverDetailPanel } from '@/components/dashboard/DriverDetailPanel';
import { TimingTower } from '@/components/dashboard/TimingTower';
import { Skeleton } from '@/components/ui/Skeleton';

const TrackScene = dynamic(() => import('@/components/track/TrackScene').then((m) => m.TrackScene), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});

const FIRST_YEAR = 2018;

export default function ReplayPage({ params }: { params: { year: string; round: string } }) {
  const year = Number(params.year);
  const round = Number(params.round);
  const router = useRouter();
  const ctrl = useReplay(year, round);

  const { data: sessionsData } = useSessionsForYear(year);
  const rounds = useMemo(() => {
    const list = (sessionsData?.sessions ?? []).filter((s) => s.round != null);
    // De-dupe by round and sort.
    const byRound = new Map<number, string>();
    for (const s of list) if (s.round != null && !byRound.has(s.round)) byRound.set(s.round, s.circuitShortName);
    return [...byRound.entries()].sort((a, b) => a[0] - b[0]).map(([r, name]) => ({ round: r, name }));
  }, [sessionsData]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const out: number[] = [];
    for (let y = current; y >= FIRST_YEAR; y--) out.push(y);
    return out;
  }, []);

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col gap-2 p-2">
      {/* race selector */}
      <div className="flex items-center gap-3 px-1 shrink-0">
        <h1 className="font-sans text-sm font-semibold text-white">Race Replay</h1>
        <Select
          value={String(year)}
          onChange={(v) => router.push(`/replay/${v}/1`)}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
        />
        <Select
          value={String(round)}
          onChange={(v) => router.push(`/replay/${year}/${v}`)}
          options={
            rounds.length
              ? rounds.map((r) => ({ value: String(r.round), label: `R${r.round} · ${r.name}` }))
              : [{ value: String(round), label: `Round ${round}` }]
          }
        />
        {ctrl.session && (
          <span className="label">
            {ctrl.session.country} · {ctrl.session.name}
          </span>
        )}
        <span className="ml-auto mono text-[10px] text-[#FFD600] tracking-wide">
          ◆ INTERPOLATED REPLAY RECONSTRUCTION
        </span>
      </div>

      {/* main view */}
      <div className="flex-1 grid gap-2 min-h-0" style={{ gridTemplateColumns: '22% 52% 26%' }}>
        <div className="min-h-0">
          <TimingTower />
        </div>
        <div className="min-h-0 panel overflow-hidden relative">
          {ctrl.ready ? <TrackScene /> : <Skeleton className="w-full h-full" />}
          <div className="absolute top-2 left-2 label pointer-events-none">Track Map</div>
        </div>
        <div className="min-h-0">
          <DriverDetailPanel />
        </div>
      </div>

      {/* playback controls */}
      <div className="shrink-0">
        <ReplayControls ctrl={ctrl} />
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-surface border border-border-strong text-[12px] mono text-white pl-2 pr-7 py-1.5 hover:bg-[#ffffff0c] focus:outline-none"
        style={{ borderRadius: 2 }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
    </div>
  );
}
