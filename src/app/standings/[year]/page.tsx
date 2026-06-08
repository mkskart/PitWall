'use client';

import { useRouter } from 'next/navigation';
import { DriverStandingsTable } from '@/components/standings/DriverStandingsTable';
import { ConstructorTable } from '@/components/standings/ConstructorTable';
import { RaceCalendar } from '@/components/standings/RaceCalendar';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2010 + 1 }, (_, i) => CURRENT_YEAR - i);

export default function StandingsPage({ params }: { params: { year: string } }) {
  const router = useRouter();
  const parsed = Number(params.year);
  const year = Number.isFinite(parsed) ? parsed : CURRENT_YEAR;

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-sans text-sm font-semibold text-white">Championship Standings</h1>
          <span className="label">{year} Season</span>
        </div>

        <label className="flex items-center gap-2">
          <span className="label">Season</span>
          <select
            value={year}
            onChange={(e) => router.push(`/standings/${e.target.value}`)}
            className="panel mono text-[12px] text-white bg-surface px-2 py-1 outline-none focus:border-border-strong"
          >
            {YEARS.map((y) => (
              <option key={y} value={y} className="bg-surface">
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <DriverStandingsTable year={year} />
        <ConstructorTable year={year} />
      </div>

      <RaceCalendar year={year} />
    </div>
  );
}
