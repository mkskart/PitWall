/**
 * Simulation engine.
 *
 * When OpenF1 returns no data (off-season, API outage, or simply no live
 * session) PitWall still needs something believable to render. This engine
 * generates a synthetic-but-realistic race for a default circuit using the
 * 2024 grid, complete with tire degradation, pit stops, and position changes.
 *
 * It is NEVER presented as real data — the UI shows a "SIMULATION MODE" pill
 * whenever this engine is driving the store.
 */

import type { CarState, Compound, Driver, Lap, PitStop, Stint } from './types';
import { normalizeTeamName, teamColor } from './teamColors';
import { degPenalty, optimalLife } from './tireDeg';
import type { CircuitPath } from './trackPaths/_spline';

interface GridEntry {
  num: number;
  code: string;
  first: string;
  last: string;
  team: string;
  /** Relative pace, seconds added to a baseline lap. Lower = faster. */
  pace: number;
}

/** 2024 grid with approximate relative pace deltas. */
export const GRID_2024: GridEntry[] = [
  { num: 1, code: 'VER', first: 'Max', last: 'Verstappen', team: 'Red Bull Racing', pace: 0.0 },
  { num: 11, code: 'PER', first: 'Sergio', last: 'Perez', team: 'Red Bull Racing', pace: 0.45 },
  { num: 16, code: 'LEC', first: 'Charles', last: 'Leclerc', team: 'Ferrari', pace: 0.12 },
  { num: 55, code: 'SAI', first: 'Carlos', last: 'Sainz', team: 'Ferrari', pace: 0.18 },
  { num: 4, code: 'NOR', first: 'Lando', last: 'Norris', team: 'McLaren', pace: 0.08 },
  { num: 81, code: 'PIA', first: 'Oscar', last: 'Piastri', team: 'McLaren', pace: 0.2 },
  { num: 44, code: 'HAM', first: 'Lewis', last: 'Hamilton', team: 'Mercedes', pace: 0.3 },
  { num: 63, code: 'RUS', first: 'George', last: 'Russell', team: 'Mercedes', pace: 0.28 },
  { num: 14, code: 'ALO', first: 'Fernando', last: 'Alonso', team: 'Aston Martin', pace: 0.55 },
  { num: 18, code: 'STR', first: 'Lance', last: 'Stroll', team: 'Aston Martin', pace: 0.8 },
  { num: 10, code: 'GAS', first: 'Pierre', last: 'Gasly', team: 'Alpine', pace: 0.95 },
  { num: 31, code: 'OCO', first: 'Esteban', last: 'Ocon', team: 'Alpine', pace: 1.0 },
  { num: 23, code: 'ALB', first: 'Alex', last: 'Albon', team: 'Williams', pace: 0.9 },
  { num: 2, code: 'SAR', first: 'Logan', last: 'Sargeant', team: 'Williams', pace: 1.2 },
  { num: 22, code: 'TSU', first: 'Yuki', last: 'Tsunoda', team: 'RB', pace: 0.85 },
  { num: 3, code: 'RIC', first: 'Daniel', last: 'Ricciardo', team: 'RB', pace: 0.92 },
  { num: 77, code: 'BOT', first: 'Valtteri', last: 'Bottas', team: 'Kick Sauber', pace: 1.15 },
  { num: 24, code: 'ZHO', first: 'Guanyu', last: 'Zhou', team: 'Kick Sauber', pace: 1.25 },
  { num: 20, code: 'MAG', first: 'Kevin', last: 'Magnussen', team: 'Haas F1 Team', pace: 1.05 },
  { num: 27, code: 'HUL', first: 'Nico', last: 'Hulkenberg', team: 'Haas F1 Team', pace: 0.98 },
];

export function simDrivers(): Driver[] {
  return GRID_2024.map((g) => ({
    driverNumber: g.num,
    code: g.code,
    fullName: `${g.first} ${g.last}`,
    firstName: g.first,
    lastName: g.last,
    team: g.team,
    teamName: normalizeTeamName(g.team),
    color: teamColor(g.team),
  }));
}

interface CarSim {
  entry: GridEntry;
  /** Distance traveled in laps (integer part = lap, fraction = progress). */
  dist: number;
  compound: Compound;
  stintStartLap: number;
  tyreAge: number;
  stints: Stint[];
  laps: Lap[];
  pits: PitStop[];
  lastLapTime: number | null;
  bestLapTime: number | null;
  lapStartTime: number;
  /** Planned pit laps for a one/two-stop strategy. */
  pitPlan: number[];
  pitting: boolean;
}

const BASE_LAP = 92.0; // ~1:32 baseline for Bahrain
const TOTAL_LAPS = 57;

export class SimEngine {
  private cars: CarSim[];
  private circuit: CircuitPath;
  private elapsed = 0; // seconds of race time
  private startEpoch = Date.now();

  constructor(circuit: CircuitPath, seed = 1) {
    this.circuit = circuit;
    const rng = mulberry32(seed);
    this.cars = GRID_2024.map((entry, i) => {
      const oneStop = rng() > 0.5;
      const pitPlan = oneStop
        ? [Math.round(TOTAL_LAPS * (0.4 + rng() * 0.15))]
        : [Math.round(TOTAL_LAPS * 0.28), Math.round(TOTAL_LAPS * 0.62)];
      const startCompound: Compound = oneStop ? 'MEDIUM' : 'SOFT';
      return {
        entry,
        dist: -i * 0.004, // staggered grid spacing
        compound: startCompound,
        stintStartLap: 1,
        tyreAge: 0,
        stints: [],
        laps: [],
        pits: [],
        lastLapTime: null,
        bestLapTime: null,
        lapStartTime: 0,
        pitPlan,
        pitting: false,
      };
    });
  }

  /** Advance the simulation by dtMs and return fresh car states + clock. */
  tick(dtMs: number): { cars: CarState[]; lap: number; elapsed: number } {
    const dt = dtMs / 1000;
    this.elapsed += dt;

    for (const car of this.cars) {
      if (car.dist >= TOTAL_LAPS) continue;
      const currentLap = Math.floor(Math.max(0, car.dist)) + 1;

      // Lap time = baseline + driver pace + tire deg + small noise.
      const deg = degPenalty(car.compound, car.tyreAge);
      const lapTime = BASE_LAP + car.entry.pace + deg + (Math.sin(this.elapsed * 0.7 + car.entry.num) * 0.08);
      const lapsPerSecond = 1 / lapTime;
      const prevLap = Math.floor(Math.max(0, car.dist));
      car.dist += lapsPerSecond * dt * (car.pitting ? 0.55 : 1);
      const newLap = Math.floor(Math.max(0, car.dist));

      // Crossed the line — record the completed lap.
      if (newLap > prevLap && newLap >= 1) {
        const recorded = lapTime + (car.pitting ? 22 : 0);
        car.lastLapTime = recorded;
        car.bestLapTime = car.bestLapTime == null ? recorded : Math.min(car.bestLapTime, recorded);
        car.tyreAge += 1;
        car.laps.push({
          driverNumber: car.entry.num,
          lapNumber: newLap,
          dateStart: new Date(this.startEpoch + this.elapsed * 1000).toISOString(),
          lapDuration: recorded,
          sector1: recorded * 0.3,
          sector2: recorded * 0.38,
          sector3: recorded * 0.32,
          speedTrap: 300 + Math.round(Math.sin(car.entry.num) * 10),
          isPitOut: car.pitting,
        });
        car.pitting = false;

        // Pit-stop logic — swap compound at planned laps.
        if (car.pitPlan.includes(newLap)) {
          car.pits.push({
            driverNumber: car.entry.num,
            lapNumber: newLap,
            date: new Date(this.startEpoch + this.elapsed * 1000).toISOString(),
            duration: 2.2 + Math.random() * 0.8,
          });
          car.stints.push({
            driverNumber: car.entry.num,
            stintNumber: car.stints.length + 1,
            lapStart: car.stintStartLap,
            lapEnd: newLap,
            compound: car.compound,
            tyreAgeAtStart: 0,
          });
          car.compound = nextCompound(car.compound);
          car.stintStartLap = newLap + 1;
          car.tyreAge = 0;
          car.pitting = true;
        }
      }
    }

    // Order by total distance.
    const ordered = [...this.cars].sort((a, b) => b.dist - a.dist);
    const leaderDist = ordered[0]?.dist ?? 0;
    const leaderLapTime = BASE_LAP + (ordered[0]?.entry.pace ?? 0);

    const states: CarState[] = ordered.map((car, idx) => {
      const progress = ((car.dist % 1) + 1) % 1;
      const [x, z] = pointAt(this.circuit, progress);
      const gap = idx === 0 ? 0 : (leaderDist - car.dist) * leaderLapTime;
      return {
        driverNumber: car.entry.num,
        x,
        z,
        position: idx + 1,
        progress,
        lapNumber: Math.min(TOTAL_LAPS, Math.floor(Math.max(0, car.dist)) + 1),
        lastLap: car.lastLapTime,
        bestLap: car.bestLapTime,
        gapToLeader: gap,
        speed: simSpeed(progress),
        throttle: simThrottle(progress),
        brake: simBrake(progress),
        drs: this.circuit.drsZones.some(([s, e]) => inZone(progress, s, e)) && idx > 0,
        compound: car.compound,
        tyreAge: car.tyreAge,
        sector1: car.lastLapTime ? car.lastLapTime * 0.3 : null,
        sector2: car.lastLapTime ? car.lastLapTime * 0.38 : null,
        sector3: car.lastLapTime ? car.lastLapTime * 0.32 : null,
      };
    });

    const lap = Math.min(TOTAL_LAPS, Math.floor(Math.max(0, leaderDist)) + 1);
    return { cars: states, lap, elapsed: this.elapsed };
  }

  get totalLaps() {
    return TOTAL_LAPS;
  }

  /** Snapshot of accumulated laps/stints/pits for the strategy timeline. */
  snapshot() {
    return {
      laps: this.cars.flatMap((c) => c.laps),
      stints: this.cars.flatMap((c) => [
        ...c.stints,
        // include the in-progress stint
        {
          driverNumber: c.entry.num,
          stintNumber: c.stints.length + 1,
          lapStart: c.stintStartLap,
          lapEnd: Math.floor(Math.max(0, c.dist)) + 1,
          compound: c.compound,
          tyreAgeAtStart: 0,
        } as Stint,
      ]),
      pits: this.cars.flatMap((c) => c.pits),
    };
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function nextCompound(c: Compound): Compound {
  if (c === 'SOFT') return 'MEDIUM';
  if (c === 'MEDIUM') return 'HARD';
  return 'MEDIUM';
}

function inZone(p: number, start: number, end: number): boolean {
  if (start <= end) return p >= start && p <= end;
  return p >= start || p <= end; // wraps past the start/finish line
}

/** Interpolated [x, z] at fractional lap progress along the circuit points. */
export function pointAt(circuit: CircuitPath, progress: number): [number, number] {
  const pts = circuit.points;
  const n = pts.length;
  const f = ((progress % 1) + 1) % 1;
  const fi = f * n;
  const i = Math.floor(fi) % n;
  const j = (i + 1) % n;
  const t = fi - Math.floor(fi);
  return [pts[i][0] + (pts[j][0] - pts[i][0]) * t, pts[i][1] + (pts[j][1] - pts[i][1]) * t];
}

// Pseudo speed/throttle/brake profiles around the lap for the detail panel.
function simSpeed(p: number): number {
  const corner = Math.abs(Math.sin(p * Math.PI * 7));
  return Math.round(120 + (1 - corner) * 200);
}
function simThrottle(p: number): number {
  const corner = Math.abs(Math.sin(p * Math.PI * 7));
  return Math.round((1 - corner) * 100);
}
function simBrake(p: number): number {
  const corner = Math.abs(Math.sin(p * Math.PI * 7));
  return Math.round(corner > 0.85 ? (corner - 0.85) * 600 : 0);
}

/** Deterministic PRNG so the sim is reproducible per seed. */
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { TOTAL_LAPS, optimalLife };
