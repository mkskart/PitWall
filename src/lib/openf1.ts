/**
 * Typed OpenF1 API client. https://api.openf1.org/v1
 *
 * Server-side only (Next.js API routes) — the browser never talks to OpenF1
 * directly, so caching, validation, and fallback live in one place. Every
 * response is validated with Zod at the boundary (see lib/schemas.ts): bad
 * rows are dropped loudly in dev and silently in prod, and every helper
 * degrades to an empty result rather than throwing.
 */

import { z } from 'zod';
import {
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
import { env } from './env';
import { fetchJsonSafe, type SafeFetchOptions } from './fetcher';
import {
  parseRows,
  openF1SessionSchema,
  openF1DriverSchema,
  openF1PositionSchema,
  openF1LocationSchema,
  openF1LapSchema,
  openF1CarDataSchema,
  openF1PitSchema,
  openF1StintSchema,
} from './schemas';

type RawSession = z.infer<typeof openF1SessionSchema>;
export type RawPosition = z.infer<typeof openF1PositionSchema>;
export type RawLocation = z.infer<typeof openF1LocationSchema>;
type RawCarData = z.infer<typeof openF1CarDataSchema>;

async function of1<S extends z.ZodTypeAny>(
  schema: S,
  path: string,
  params: Record<string, string | number | undefined>,
  opts: SafeFetchOptions = {},
): Promise<z.infer<S>[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const url = `${env.OPENF1_BASE_URL}${path}?${qs.toString()}`;
  const data = await fetchJsonSafe<unknown>(url, opts);
  return parseRows(schema, data, `openf1${path}`);
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function getSessions(params: { year?: number; session_key?: number }): Promise<SessionInfo[]> {
  const raw = await of1(openF1SessionSchema, '/sessions', { year: params.year, session_key: params.session_key }, { revalidate: 300 });
  const now = Date.now();
  return raw.map((s) => normalizeSession(s, now));
}

export function normalizeSession(s: RawSession, now = Date.now()): SessionInfo {
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
    circuitKey: String(s.circuit_key || ''),
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
  // OpenF1 supports the literal `session_key=latest`.
  // Short timeout + no retries: this is a fast "is anyone home?" probe.
  // If OpenF1 is unreachable the dashboard falls back to simulation immediately.
  const url = `${env.OPENF1_BASE_URL}/sessions?session_key=latest`;
  const data = await fetchJsonSafe<unknown>(url, { revalidate: 30, timeoutMs: 3000, retries: 0 });
  const raw = parseRows(openF1SessionSchema, data, 'openf1/sessions:latest');
  if (!raw.length) return null;
  return normalizeSession(raw[raw.length - 1]);
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

export async function getDrivers(sessionKey: number): Promise<Driver[]> {
  const raw = await of1(openF1DriverSchema, '/drivers', { session_key: sessionKey }, { revalidate: 3600 });
  return raw.map((d) => ({
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
  }));
}

// ─── Positions & locations (live polling, no-store) ─────────────────────────

/** Position rows, optionally only those after `since` (ISO). */
export async function getPositions(sessionKey: number, since?: string): Promise<RawPosition[]> {
  return of1(openF1PositionSchema, '/position', { session_key: sessionKey, 'date>': since }, { noStore: true, retries: 1 });
}

/** Location rows after `since` (ISO). */
export async function getLocations(sessionKey: number, since: string): Promise<RawLocation[]> {
  return of1(openF1LocationSchema, '/location', { session_key: sessionKey, 'date>': since }, { noStore: true, retries: 1 });
}

// ─── Laps ────────────────────────────────────────────────────────────────────

export async function getLaps(sessionKey: number, driverNumber?: number): Promise<Lap[]> {
  const raw = await of1(openF1LapSchema, '/laps', { session_key: sessionKey, driver_number: driverNumber }, { revalidate: 3600 });
  return raw.map((l) => ({
    driverNumber: l.driver_number,
    lapNumber: l.lap_number,
    dateStart: l.date_start,
    lapDuration: l.lap_duration,
    sector1: l.duration_sector_1,
    sector2: l.duration_sector_2,
    sector3: l.duration_sector_3,
    speedTrap: l.st_speed,
    isPitOut: l.is_pit_out_lap,
  }));
}

// ─── Telemetry (car_data) ────────────────────────────────────────────────────

export async function getCarData(sessionKey: number, driverNumber: number, dateStart?: string, dateEnd?: string): Promise<RawCarData[]> {
  return of1(
    openF1CarDataSchema,
    '/car_data',
    { session_key: sessionKey, driver_number: driverNumber, 'date>': dateStart, 'date<': dateEnd },
    { revalidate: 3600 },
  );
}

/**
 * Build a normalized telemetry lap. Distance is derived by integrating speed
 * (km/h → m/s) across sample timestamps, giving an x-axis in meters for charts.
 */
export function buildTelemetryLap(raw: RawCarData[], driverNumber: number, lapNumber: number): TelemetryLap {
  const sorted = [...raw].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const samples: TelemetrySample[] = [];
  let distance = 0;
  let prevT: number | null = null;
  for (const s of sorted) {
    const t = new Date(s.date).getTime();
    if (prevT != null) {
      const dt = (t - prevT) / 1000;
      distance += (s.speed / 3.6) * dt;
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
  const raw = await of1(openF1PitSchema, '/pit', { session_key: sessionKey }, { revalidate: 600 });
  return raw.map((p) => ({
    driverNumber: p.driver_number,
    lapNumber: p.lap_number,
    date: p.date,
    duration: p.pit_duration,
  }));
}

// ─── Stints ──────────────────────────────────────────────────────────────────

export async function getStints(sessionKey: number): Promise<Stint[]> {
  const raw = await of1(openF1StintSchema, '/stints', { session_key: sessionKey }, { revalidate: 600 });
  return raw.map((s) => ({
    driverNumber: s.driver_number,
    stintNumber: s.stint_number,
    lapStart: s.lap_start,
    lapEnd: s.lap_end,
    compound: normalizeCompound(s.compound),
    tyreAgeAtStart: s.tyre_age_at_start,
  }));
}
