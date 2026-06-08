'use client';

import { useQuery } from '@tanstack/react-query';
import type { SessionInfo } from '@/lib/types';

interface SessionsResponse {
  latest: SessionInfo | null;
  sessions: SessionInfo[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`request failed: ${url}`);
  return res.json();
}

/** Probe for the latest session globally — used by the header live pill. */
export function useLatestSession() {
  return useQuery({
    queryKey: ['sessions', 'latest'],
    queryFn: () => fetchJson<SessionsResponse>('/api/sessions'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/** All sessions/rounds for a given year. */
export function useSessionsForYear(year: number | null) {
  return useQuery({
    queryKey: ['sessions', year],
    enabled: year != null,
    queryFn: () => fetchJson<SessionsResponse>(`/api/sessions?year=${year}`),
    staleTime: Infinity,
  });
}
