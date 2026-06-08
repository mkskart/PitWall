'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSessionsForYear } from '@/hooks/useSessions';
import type { Driver } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { TeamColorAccent } from '@/components/ui/TeamColorAccent';

export interface PickerSelection {
  year: number;
  sessionKey: number;
  sessionName: string;
  driver: Driver;
}

interface DriversResponse {
  drivers: Driver[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`request failed: ${url}`);
  return res.json();
}

/** OpenF1 covers 2023 onward. */
const FIRST_YEAR = 2023;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - FIRST_YEAR + 1 }, (_, i) => CURRENT_YEAR - i);

function useDrivers(sessionKey: number | null) {
  return useQuery({
    queryKey: ['drivers', sessionKey],
    enabled: sessionKey != null,
    queryFn: () => fetchJson<DriversResponse>(`/api/drivers?session_key=${sessionKey}`),
    staleTime: Infinity,
  });
}

export function DriverPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PickerSelection | null;
  onChange: (sel: PickerSelection) => void;
}) {
  const [year, setYear] = useState<number>(value?.year ?? CURRENT_YEAR);
  const [sessionKey, setSessionKey] = useState<number | null>(value?.sessionKey ?? null);
  const [search, setSearch] = useState('');

  const sessionsQ = useSessionsForYear(year);
  const driversQ = useDrivers(sessionKey);

  // Only race sessions with a real session key are useful for the compare flow.
  const raceSessions = useMemo(() => {
    const all = sessionsQ.data?.sessions ?? [];
    return all.filter((s) => s.sessionKey != null && /race/i.test(s.type));
  }, [sessionsQ.data]);

  const selectedSession = useMemo(
    () => raceSessions.find((s) => s.sessionKey === sessionKey) ?? null,
    [raceSessions, sessionKey],
  );

  const filteredDrivers = useMemo(() => {
    const list = driversQ.data?.drivers ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.team.toLowerCase().includes(q) ||
        String(d.driverNumber).includes(q),
    );
  }, [driversQ.data, search]);

  function pickDriver(driver: Driver) {
    if (sessionKey == null || !selectedSession) return;
    onChange({
      year,
      sessionKey,
      sessionName: selectedSession.name,
      driver,
    });
    setSearch('');
  }

  return (
    <div className="panel flex flex-col">
      <div className="flex items-center justify-between px-3 h-8 border-b border-border shrink-0">
        <span className="label">{label}</span>
        {value && (
          <span className="mono text-[10px] text-muted">
            {value.year} · {value.sessionName}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Year + Session selectors */}
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="label">Year</span>
            <select
              className="bg-surface-2 border border-border-strong text-xs mono px-2 h-8 text-white outline-none focus:border-white/30"
              style={{ borderRadius: 2 }}
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setSessionKey(null);
              }}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Session</span>
            <select
              className="bg-surface-2 border border-border-strong text-xs mono px-2 h-8 text-white outline-none focus:border-white/30 disabled:opacity-40"
              style={{ borderRadius: 2 }}
              value={sessionKey ?? ''}
              disabled={sessionsQ.isLoading || raceSessions.length === 0}
              onChange={(e) => setSessionKey(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">
                {sessionsQ.isLoading ? 'Loading…' : raceSessions.length ? 'Select…' : 'No races'}
              </option>
              {raceSessions.map((s) => (
                <option key={s.sessionKey} value={s.sessionKey!}>
                  {s.circuitShortName} — {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Driver search + list */}
        <div className="flex flex-col gap-1">
          <span className="label">Driver</span>
          <input
            type="text"
            placeholder={sessionKey == null ? 'Pick a session first' : 'Search name / code / team…'}
            disabled={sessionKey == null}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-surface-2 border border-border-strong text-xs font-sans px-2 h-8 text-white outline-none focus:border-white/30 placeholder:text-muted disabled:opacity-40"
            style={{ borderRadius: 2 }}
          />

          {sessionKey != null && (
            <div className="mt-1 max-h-44 overflow-y-auto flex flex-col gap-px">
              {driversQ.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} style={{ height: 30 }} />)
              ) : filteredDrivers.length === 0 ? (
                <div className="text-xs text-muted px-2 py-3">No drivers found.</div>
              ) : (
                filteredDrivers.map((d) => {
                  const active = value?.driver.driverNumber === d.driverNumber;
                  return (
                    <button
                      key={d.driverNumber}
                      onClick={() => pickDriver(d)}
                      className={cn(
                        'flex items-center gap-2 h-[30px] px-2 text-left hover:bg-[#ffffff08] transition-colors',
                        active && 'bg-[#ffffff0d]',
                      )}
                      style={{ borderRadius: 2 }}
                    >
                      <TeamColorAccent color={d.color} width={3} className="h-4" />
                      <span className="mono text-[11px] w-7" style={{ color: d.color }}>
                        {d.code}
                      </span>
                      <span className="text-xs font-sans text-white truncate flex-1">{d.fullName}</span>
                      <span className="text-[10px] text-muted font-sans truncate max-w-[40%]">{d.team}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Selected driver summary */}
        {value && (
          <div
            className="flex items-center gap-2 px-2 py-2 border border-border-strong bg-surface-2"
            style={{ borderRadius: 2 }}
          >
            <TeamColorAccent color={value.driver.color} width={3} className="h-6" />
            <span className="mono text-sm" style={{ color: value.driver.color }}>
              {value.driver.code}
            </span>
            <span className="text-xs font-sans text-white truncate">{value.driver.fullName}</span>
            <span className="mono text-[10px] text-muted ml-auto">#{value.driver.driverNumber}</span>
          </div>
        )}
      </div>
    </div>
  );
}
