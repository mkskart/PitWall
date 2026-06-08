/**
 * Typed OpenF1 API client. https://api.openf1.org/v1
 *
 * This module runs server-side only (inside Next.js API routes). The browser
 * never talks to OpenF1 directly — all polling is proxied so we can cache,
 * normalize, and fall back to Ergast in one place.
 */

import {
  type OpenF1Session,
  type OpenF1Driver,
  type OpenF1Position,
  type OpenF1Lap,
  type OpenF1CarData,
  type OpenF1Pit,
  type OpenF1Stint,
  type SessionInfo,
  type Driver,
  type Lap,
  type PitStop,
  type Stint,
  type TelemetryLap,
  type TelemetrySample,
  isDrsOpen,
} from './types';
import { teamColor, normalizeTeamName } from './teamColors';
import { normalizeCompound } from './utils';

const BASE = process.env.OPENF1_BASE_URL ?? 'https://api.openf1.org/v1';

interface FetchOpts {
  /** ISR revalidate seconds. Use a small value for live data. */
  revalidate?: number;
  /** When true, bypass the Next data cache entirely (SSE polling). */
  noStore?: boolean;
}

async function of1<T>(path: string, params: Record<string, string | number | undefined>, opts: FetchOpts = {}): Promise<T[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const url = `${BASE}${path}?${qs.toString()}`;
  const next = opts.noStore
    ? undefined
    : { revalidate: opts.revalidate ?? 60 };
  try {
    const res = await fetch(url, {
      cache: opts.noStore ? 'no-store' : undefined,
      next,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as T[];
    return Array.isArray(data) ? data : [];
  } catch {
    // Network error / OpenF1 down — return empty so callers can fall back.
    return [];
  }
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function getSessions(params: { year?: number; round?: number; session_key?: number }): Promise<SessionInfo[]> {
  const raw = await of1<OpenF1Session>('/sessions', { year: params.year, session_key: params.session_key }, { revalidate: 300 });
  const now = Date.now();
  return raw.map((s) => normalizeSession(s, now));
}

export function normalizeSession(s: OpenF1Session, now = Date.now()): SessionInfo {
  const start = new Date(s.date_start).getTime();
  const end = new Date(s.date_end).getTime();
  return {
    sessionKey: s.session_key,
    meetingKey: s.meeting_key,
    year: s.year,
    round: null,
    name: s.session_name,
    type: s.session_type,
    circuitShortName: s.circuit_short_name,
    circuitKey: String(s.circuit_key ?? ''),
    country: s.country_name,
    location: s.location,
    dateStart: s.date_start,
    dateEnd: s.date_end,
    isLive: Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end,
    source: 'openf1',
  };
}

/** Find the latest session globally (used to detect a live race). */
export async function getLatestSession(): Promise<SessionInfo | null> {
  const raw = await of1<OpenF1Session>('/sessions', { session_key: 'latest' as unknown as number }, { revalidate: 30 });
  if (!raw.length) return null;
  return normalizeSession(raw[raw.length - 1]);
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

export async function getDrivers(sessionKey: number): Promise<Driver[]> {
  const raw = await of1<OpenF1Driver>('/drivers', { session_key: sessionKey }, { revalidate: 3600 });
  return raw.map(normalizeDriver);
}

export function normalizeDriver(d: OpenF1Driver): Driver {
  return {
    driverNumber: d.driver_number,
    code: d.name_acronym,
    fullName: d.full_name,
    firstName: d.first_name,
    lastName: d.last_name,
    team: d.team_name,
    teamName: normalizeTeamName(d.team_name),
    color: teamColor(d.team_name, d.team_colour),
    headshotUrl: d.headshot_url,
    countryCode: d.country_code,
  };
}

// ─── Positions ───────────────────────────────────────────────────────────────

/** Raw position rows since `since` (ISO). Used by the SSE route to poll deltas. */
export async function getPositions(sessionKey: number, since?: string): Promise<OpenF1Position[]> {
  return of1<OpenF1Position>(
    '/position',
    { session_key: sessionKey, 'date>': since },
    { noStore: true },
  );
}

// ─── Laps ────────────────────────────────────────────────────────────────────

export async function getLaps(sessionKey: number, driverNumber?: number): Promise<Lap[]> {
  const raw = await of1<OpenF1Lap>('/laps', { session_key: sessionKey, driver_number: driverNumber }, { revalidate: 3600 });
  return raw.map(normalizeLap);
}

export function normalizeLap(l: OpenF1Lap): Lap {
  return {
    driverNumber: l.driver_number,
    lapNumber: l.lap_number,
    dateStart: l.date_start,
    lapDuration: l.lap_duration,
    sector1: l.duration_sector_1,
    sector2: l.duration_sector_2,
    sector3: l.duration_sector_3,
    speedTrap: l.st_speed,
    isPitOut: Boolean(l.is_pit_out_lap),
  };
}

// ─── Telemetry (car_data) ────────────────────────────────────────────────────

export async function getCarData(sessionKey: number, driverNumber: number, dateStart?: string, dateEnd?: string): Promise<OpenF1CarData[]> {
  return of1<OpenF1CarData>(
    '/car_data',
    { session_key: sessionKey, driver_number: driverNumber, 'date>': dateStart, 'date<': dateEnd },
    { revalidate: 3600 },
  );
}

/**
 * Build a normalized telemetry lap. Distance is derived by integrating speed
 * (km/h → m/s) across sample timestamps, giving an x-axis in meters for charts.
 */
export function buildTelemetryLap(raw: OpenF1CarData[], driverNumber: number, lapNumber: number): TelemetryLap {
  const sorted = [...raw].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const samples: TelemetrySample[] = [];
  let distance = 0;
  let prevT: number | null = null;
  for (const s of sorted) {
    const t = new Date(s.date).getTime();
    if (prevT != null) {
      const dt = (t - prevT) / 1000; // seconds
      distance += (s.speed / 3.6) * dt; // m/s * s = m
    }
    prevT = t;
    samples.push({
      date: s.date,
      distance,
      speed: s.speed,
      throttle: s.throttle,
      brake: s.brake,
      gear: s.n_gear,
      rpm: s.rpm,
      drs: isDrsOpen(s.drs),
    });
  }
  return { driverNumber, lapNumber, samples };
}

// ─── Pit stops ───────────────────────────────────────────────────────────────

export async function getPits(sessionKey: number): Promise<PitStop[]> {
  const raw = await of1<OpenF1Pit>('/pit', { session_key: sessionKey }, { revalidate: 600 });
  return raw.map((p) => ({
    driverNumber: p.driver_number,
    lapNumber: p.lap_number,
    date: p.date,
    duration: p.pit_duration,
  }));
}

// ─── Stints ──────────────────────────────────────────────────────────────────

export async function getStints(sessionKey: number): Promise<Stint[]> {
  const raw = await of1<OpenF1Stint>('/stints', { session_key: sessionKey }, { revalidate: 600 });
  return raw.map((s) => ({
    driverNumber: s.driver_number,
    stintNumber: s.stint_number,
    lapStart: s.lap_start,
    lapEnd: s.lap_end,
    compound: normalizeCompound(s.compound),
    tyreAgeAtStart: s.tyre_age_at_start,
  }));
}
