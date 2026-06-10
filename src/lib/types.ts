/**
 * All shared TypeScript interfaces for PitWall.
 *
 * These are the normalized domain types the UI consumes, decoupled from any
 * data source. Raw upstream shapes are defined as Zod schemas in lib/schemas.ts
 * (validated at the boundary); normalization happens in lib/openf1.ts and
 * lib/ergast.ts so the rest of the app never knows which provider supplied
 * the data.
 */

import type { TeamName } from './teamColors';

// ─────────────────────────────────────────────────────────────────────────────
// Tire compounds
// ─────────────────────────────────────────────────────────────────────────────

export type Compound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET' | 'UNKNOWN';

export const COMPOUND_COLORS: Record<Compound, string> = {
  SOFT: '#FF3333',
  MEDIUM: '#FFD700',
  HARD: '#CCCCCC',
  INTERMEDIATE: '#39B54A',
  WET: '#0067FF',
  UNKNOWN: '#6b6b7b',
};

export const COMPOUND_SHORT: Record<Compound, string> = {
  SOFT: 'S',
  MEDIUM: 'M',
  HARD: 'H',
  INTERMEDIATE: 'I',
  WET: 'W',
  UNKNOWN: '?',
};

// ─────────────────────────────────────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionInfo {
  sessionKey: number | null;
  meetingKey: number | null;
  year: number;
  round: number | null;
  name: string;
  type: string;
  circuitShortName: string;
  circuitKey: string;
  country: string;
  location: string;
  dateStart: string;
  dateEnd: string;
  /** True if the wall-clock now sits between start and end. */
  isLive: boolean;
  /** Data source that produced this record. */
  source: 'openf1' | 'ergast' | 'sim';
}

// ─────────────────────────────────────────────────────────────────────────────
// Drivers
// ─────────────────────────────────────────────────────────────────────────────

export interface Driver {
  driverNumber: number;
  code: string; // 3-letter acronym, e.g. VER
  fullName: string;
  firstName: string;
  lastName: string;
  team: string;
  teamName: TeamName | null;
  color: string; // resolved team color hex
  headshotUrl?: string;
  countryCode?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Position / location
// ─────────────────────────────────────────────────────────────────────────────

/** Live order entry pushed to the timing tower over SSE. */
export interface PositionUpdate {
  driverNumber: number;
  position: number;
  date: string;
}

export interface PositionFrame {
  date: string;
  order: PositionUpdate[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Laps
// ─────────────────────────────────────────────────────────────────────────────

export interface Lap {
  driverNumber: number;
  lapNumber: number;
  dateStart: string | null;
  lapDuration: number | null;
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
  speedTrap: number | null;
  isPitOut: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Telemetry (car_data)
// ─────────────────────────────────────────────────────────────────────────────

export interface TelemetrySample {
  date: string;
  /** Distance into the lap in meters (derived by integrating speed). */
  distance: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
  drs: boolean;
}

export interface TelemetryLap {
  driverNumber: number;
  lapNumber: number;
  samples: TelemetrySample[];
}

/**
 * DRS raw values from OpenF1: 0/1 = off, 8 = eligible (no), 10/12/14 = on.
 * Anything >= 10 is treated as DRS open.
 */
export function isDrsOpen(drs: number): boolean {
  return drs >= 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pit stops
// ─────────────────────────────────────────────────────────────────────────────

export interface PitStop {
  driverNumber: number;
  lapNumber: number;
  date: string;
  duration: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stints
// ─────────────────────────────────────────────────────────────────────────────

export interface Stint {
  driverNumber: number;
  stintNumber: number;
  lapStart: number;
  lapEnd: number;
  compound: Compound;
  tyreAgeAtStart: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Standings & results (Ergast)
// ─────────────────────────────────────────────────────────────────────────────

export interface DriverStanding {
  position: number;
  points: number;
  wins: number;
  podiums: number;
  driverId: string;
  code: string;
  givenName: string;
  familyName: string;
  team: string;
  teamName: TeamName | null;
  color: string;
}

export interface ConstructorStanding {
  position: number;
  points: number;
  wins: number;
  constructorId: string;
  name: string;
  teamName: TeamName | null;
  color: string;
}

export interface RaceResultEntry {
  position: number;
  driverCode: string;
  driverName: string;
  team: string;
  color: string;
  time: string | null;
  status: string;
  points: number;
}

export interface RaceRound {
  round: number;
  raceName: string;
  circuitName: string;
  locality: string;
  country: string;
  date: string;
  time: string | null;
  /** P1/P2/P3 once completed. */
  podium: { code: string; name: string; color: string }[];
  completed: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Runtime race state (shared by SSE, replay, and sim)
// ─────────────────────────────────────────────────────────────────────────────

export interface CarState {
  driverNumber: number;
  /** Normalized track-space coordinates in [-1, 1] roughly. */
  x: number;
  z: number;
  position: number;
  /** Fractional progress around the lap [0, 1). Used by the sim/replay. */
  progress: number;
  lapNumber: number;
  lastLap: number | null;
  bestLap: number | null;
  gapToLeader: number | null;
  speed: number;
  throttle: number;
  brake: number;
  drs: boolean;
  compound: Compound;
  tyreAge: number;
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
}

export type RaceMode = 'live' | 'replay' | 'sim' | 'idle';

export interface RaceClock {
  /** Elapsed seconds since race start. */
  elapsed: number;
  lap: number;
  totalLaps: number;
}
