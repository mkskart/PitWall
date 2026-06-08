'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import type { RaceRound } from '@/lib/types';
import { useCalendar } from '@/hooks/useStandings';
import { flagEmoji, countdown } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

const SPRING = { type: 'spring' as const, stiffness: 120, damping: 20 };
const CARD_W = 190;
const CARD_H = 150;

function safeFormat(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'dd MMM');
}

function PodiumChip({ code, color }: { code: string; color: string }) {
  return (
    <span
      className="mono text-[10px] px-1.5 py-0.5 leading-none text-white"
      style={{ border: `1px solid ${color}`, borderRadius: 2, backgroundColor: `${color}1a` }}
    >
      {code}
    </span>
  );
}

function Countdown({ date }: { date: string }) {
  // Refresh once a minute so the timer stays roughly current.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(date);
  if (Number.isNaN(target.getTime())) {
    return <span className="mono text-[11px] text-muted">TBC</span>;
  }
  const { days, hours, minutes } = countdown(target, now);
  return (
    <div className="flex items-baseline gap-1">
      <span className="mono text-[15px] text-white tabular-nums">
        {days}
        <span className="text-[9px] text-muted">d</span> {String(hours).padStart(2, '0')}
        <span className="text-[9px] text-muted">h</span> {String(minutes).padStart(2, '0')}
        <span className="text-[9px] text-muted">m</span>
      </span>
    </div>
  );
}

function RoundCard({ r, index, year }: { r: RaceRound; index: number; year: number }) {
  const router = useRouter();

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: Math.min(index * 0.03, 0.4) }}
      onClick={() => router.push(`/replay/${year}/${r.round}`)}
      className="panel shrink-0 flex flex-col text-left p-2.5 gap-1.5 transition-colors hover:bg-surface-2"
      style={{ width: CARD_W, height: CARD_H }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[18px] leading-none">{flagEmoji(r.country)}</span>
        <span className="mono text-[10px] text-muted">R{r.round}</span>
      </div>

      <div className="min-h-0 flex-1">
        <div className="font-sans text-[12px] text-white leading-tight line-clamp-2">
          {r.circuitName}
        </div>
        <div className="mono text-[10px] text-muted mt-0.5">{safeFormat(r.date)}</div>
      </div>

      {r.completed ? (
        <div className="flex flex-col gap-1">
          <span className="label">Podium</span>
          <div className="flex items-center gap-1">
            {r.podium.length > 0 ? (
              r.podium
                .slice(0, 3)
                .map((p, i) => <PodiumChip key={`${p.code}-${i}`} code={p.code} color={p.color} />)
            ) : (
              <span className="mono text-[10px] text-muted">—</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="label">Starts in</span>
          <Countdown date={r.date} />
        </div>
      )}
    </motion.button>
  );
}

function CardSkeleton() {
  return <Skeleton style={{ width: CARD_W, height: CARD_H, flex: '0 0 auto' }} />;
}

export function RaceCalendar({ year }: { year: number }) {
  const { data, isLoading, isError } = useCalendar(year);
  const calendar = data?.calendar ?? [];

  return (
    <div className="panel flex flex-col overflow-hidden">
      <div className="flex items-center px-2 h-8 border-b border-border-strong shrink-0">
        <span className="label">Race Calendar · {year}</span>
      </div>

      <div className="p-2">
        {isLoading ? (
          <div className="flex gap-2 overflow-x-auto">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : isError || calendar.length === 0 ? (
          <div className="px-1 py-6 mono text-[12px] text-muted">
            No calendar available for {year}.
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {calendar.map((r, i) => (
              <RoundCard key={r.round} r={r} index={i} year={year} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
