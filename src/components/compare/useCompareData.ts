'use client';

import { useQuery } from '@tanstack/react-query';
import type { Lap, PitStop, Stint, TelemetryLap } from '@/lib/types';

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`request failed: ${url}`);
  return res.json();
}

/** Laps for a single driver in a session. */
export function useLaps(sessionKey: number | null, driverNumber: number | null) {
  return useQuery({
    queryKey: ['laps', sessionKey, driverNumber],
    enabled: sessionKey != null && driverNumber != null,
    queryFn: () =>
      fetchJson<{ laps: Lap[] }>(`/api/laps?session_key=${sessionKey}&driver_number=${driverNumber}`),
    staleTime: Infinity,
  });
}

/** Telemetry for a single driver lap. */
export function useTelemetry(
  sessionKey: number | null,
  driverNumber: number | null,
  lapNumber: number | null,
) {
  return useQuery({
    queryKey: ['telemetry', sessionKey, driverNumber, lapNumber],
    enabled: sessionKey != null && driverNumber != null && lapNumber != null,
    queryFn: () =>
      fetchJson<{ telemetry: TelemetryLap | null }>(
        `/api/telemetry?session_key=${sessionKey}&driver_number=${driverNumber}&lap_number=${lapNumber}`,
      ),
    staleTime: Infinity,
  });
}

/** All stints in a session. */
export function useStints(sessionKey: number | null) {
  return useQuery({
    queryKey: ['stints', sessionKey],
    enabled: sessionKey != null,
    queryFn: () => fetchJson<{ stints: Stint[] }>(`/api/stints?session_key=${sessionKey}`),
    staleTime: Infinity,
  });
}

/** All pit stops in a session. */
export function usePits(sessionKey: number | null) {
  return useQuery({
    queryKey: ['pit', sessionKey],
    enabled: sessionKey != null,
    queryFn: () => fetchJson<{ pits: PitStop[] }>(`/api/pit?session_key=${sessionKey}`),
    staleTime: Infinity,
  });
}

/** Median of a numeric array (0 for empty). */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Clean racing laps: drop null/zero durations, pit-out laps, and outliers
 * slower than median * 1.3 (in/out laps, safety car, traffic).
 */
export function cleanLaps(laps: Lap[]): Lap[] {
  const valid = laps.filter((l) => l.lapDuration != null && l.lapDuration > 0 && !l.isPitOut);
  const med = median(valid.map((l) => l.lapDuration as number));
  if (med <= 0) return valid;
  return valid.filter((l) => (l.lapDuration as number) <= med * 1.3);
}
