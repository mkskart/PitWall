/**
 * Replay engine.
 *
 * Given a set of timestamped car-state samples per driver, the engine can
 * resolve the fully-interpolated race state at any arbitrary elapsed time. This
 * is what powers the scrubber: dragging to t=1234s binary-searches each
 * driver's sample array for the bracketing pair and linearly interpolates
 * position/progress between them.
 *
 * Samples can come from two sources:
 *  1. Real OpenF1 /location + /position data for a historical session.
 *  2. A deterministic SimEngine run (when the live API has no data for the
 *     requested round) — the engine records snapshots into the same shape, so
 *     the scrubbing/interpolation machinery is identical either way.
 */

import type { CarState } from './types';
import { binarySearchLE, clamp, lerp } from './utils';
import { SimEngine } from './simEngine';
import type { CircuitPath } from './trackPaths/_spline';

export interface TimedSample {
  t: number; // elapsed seconds since race start
  state: CarState;
}

export interface ReplayTimeline {
  /** Per-driver sorted sample arrays. */
  byDriver: Record<number, TimedSample[]>;
  duration: number; // seconds
  totalLaps: number;
}

export class ReplayEngine {
  private timeline: ReplayTimeline;

  constructor(timeline: ReplayTimeline) {
    this.timeline = timeline;
  }

  get duration() {
    return this.timeline.duration;
  }

  get totalLaps() {
    return this.timeline.totalLaps;
  }

  /** Resolve the interpolated state of every driver at `elapsed` seconds. */
  stateAt(elapsed: number): { cars: CarState[]; lap: number; elapsed: number; totalLaps: number } {
    const t = clamp(elapsed, 0, this.timeline.duration);
    const cars: CarState[] = [];
    let maxLap = 0;

    for (const samples of Object.values(this.timeline.byDriver)) {
      if (!samples.length) continue;
      const idx = binarySearchLE(samples, t, (s) => s.t);

      let state: CarState;
      if (idx < 0) {
        state = samples[0].state;
      } else if (idx >= samples.length - 1) {
        state = samples[samples.length - 1].state;
      } else {
        const a = samples[idx];
        const b = samples[idx + 1];
        const span = b.t - a.t || 1;
        const f = clamp((t - a.t) / span, 0, 1);
        state = interpolate(a.state, b.state, f);
      }
      cars.push(state);
      maxLap = Math.max(maxLap, state.lapNumber);
    }

    // Re-rank by progress-aware total distance so order is correct at any t.
    cars.sort((a, b) => b.lapNumber + b.progress - (a.lapNumber + a.progress));
    cars.forEach((c, i) => (c.position = i + 1));

    return { cars, lap: maxLap, elapsed: t, totalLaps: this.timeline.totalLaps };
  }
}

/** Linear interpolation of two car states. Position is re-derived by ranking. */
function interpolate(a: CarState, b: CarState, f: number): CarState {
  // Guard against wrap-around in progress (e.g. 0.98 → 0.02 across the line).
  let bp = b.progress;
  if (Math.abs(bp - a.progress) > 0.5) {
    bp = bp < a.progress ? bp + 1 : bp - 1;
  }
  const progress = ((lerp(a.progress, bp, f) % 1) + 1) % 1;
  return {
    ...b,
    x: lerp(a.x, b.x, f),
    z: lerp(a.z, b.z, f),
    progress,
    lapNumber: f < 1 ? a.lapNumber : b.lapNumber,
    speed: lerp(a.speed, b.speed, f),
    throttle: lerp(a.throttle, b.throttle, f),
    brake: lerp(a.brake, b.brake, f),
  };
}

/**
 * Build a replay timeline by running the deterministic SimEngine and recording
 * a snapshot every `sampleDt` seconds of race time. Used when the live API has
 * no data for the requested historical round.
 */
export function buildSimTimeline(circuit: CircuitPath, seed: number, sampleDt = 2): ReplayTimeline {
  const engine = new SimEngine(circuit, seed);
  const byDriver: Record<number, TimedSample[]> = {};
  const stepMs = sampleDt * 1000;
  // Run roughly the full race; cap iterations as a safety net.
  let elapsed = 0;
  const maxElapsed = 60 * 110; // ~110 min ceiling
  let lastLap = 0;
  let stableLapTicks = 0;

  while (elapsed < maxElapsed) {
    const frame = engine.tick(stepMs);
    elapsed = frame.elapsed;
    for (const c of frame.cars) {
      (byDriver[c.driverNumber] ??= []).push({ t: elapsed, state: { ...c } });
    }
    // Stop once the leader has been at the final lap for a while.
    if (frame.lap >= engine.totalLaps) {
      if (frame.lap === lastLap) stableLapTicks++;
      else stableLapTicks = 0;
      lastLap = frame.lap;
      if (stableLapTicks > 30) break;
    }
  }

  return { byDriver, duration: elapsed, totalLaps: engine.totalLaps };
}

/**
 * Build a full sim-backed replay bundle: the interpolatable timeline plus the
 * accumulated lap / stint / pit history, all from one deterministic SimEngine
 * run. Used by the replay page when the live API has no dense data for the
 * requested historical round.
 */
export function buildSimReplay(circuit: CircuitPath, seed: number, sampleDt = 2) {
  const engine = new SimEngine(circuit, seed);
  const byDriver: Record<number, TimedSample[]> = {};
  const stepMs = sampleDt * 1000;
  let elapsed = 0;
  const maxElapsed = 60 * 110;
  let lastLap = 0;
  let stableLapTicks = 0;

  while (elapsed < maxElapsed) {
    const frame = engine.tick(stepMs);
    elapsed = frame.elapsed;
    for (const c of frame.cars) {
      (byDriver[c.driverNumber] ??= []).push({ t: elapsed, state: { ...c } });
    }
    if (frame.lap >= engine.totalLaps) {
      if (frame.lap === lastLap) stableLapTicks++;
      else stableLapTicks = 0;
      lastLap = frame.lap;
      if (stableLapTicks > 30) break;
    }
  }

  const snap = engine.snapshot();
  const timeline: ReplayTimeline = { byDriver, duration: elapsed, totalLaps: engine.totalLaps };
  return { timeline, ...snap };
}

/**
 * Build a replay timeline from real OpenF1 position/location data. Positions
 * give order over time; locations give x/z. The two are merged on nearest
 * timestamp per driver.
 */
export function buildRealTimeline(
  samplesByDriver: Record<number, TimedSample[]>,
  duration: number,
  totalLaps: number,
): ReplayTimeline {
  // Ensure each driver's samples are sorted by time.
  for (const num of Object.keys(samplesByDriver)) {
    samplesByDriver[Number(num)].sort((a, b) => a.t - b.t);
  }
  return { byDriver: samplesByDriver, duration, totalLaps };
}
