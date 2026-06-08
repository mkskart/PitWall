'use client';

import { useQuery } from '@tanstack/react-query';
import type { DriverStanding, ConstructorStanding, RaceRound } from '@/lib/types';

interface StandingsResponse {
  year: number;
  drivers: DriverStanding[];
  constructors: ConstructorStanding[];
}

interface CalendarResponse {
  year: number;
  calendar: RaceRound[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`request failed: ${url}`);
  return res.json();
}

/** Driver + constructor standings for a season. */
export function useStandings(year: number) {
  return useQuery({
    queryKey: ['standings', year],
    queryFn: () => fetchJson<StandingsResponse>(`/api/standings?year=${year}`),
    staleTime: Infinity,
  });
}

/** Full race calendar (with podiums / completion) for a season. */
export function useCalendar(year: number) {
  return useQuery({
    queryKey: ['results', 'calendar', year],
    queryFn: () => fetchJson<CalendarResponse>(`/api/results?year=${year}`),
    staleTime: Infinity,
  });
}
