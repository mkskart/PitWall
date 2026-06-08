/**
 * Tire degradation model.
 *
 * Each compound has a baseline grip of 1.0 when fresh and loses grip as the
 * stint ages. Softs offer the most peak grip but fall off the fastest; hards
 * are the opposite. The curves below are deliberately simple analytic models
 * (not physically rigorous) chosen to look believable on the degradation bar
 * and to feed the simulation's lap-time penalty.
 *
 *   grip(age) = max(floor, 1 - k * age^p)
 *
 * - k controls fall-off rate
 * - p > 1 makes the cliff steeper late in the stint
 * - floor prevents grip from going to zero (you can always limp around)
 */

import type { Compound } from './types';

interface DegModel {
  /** Fall-off coefficient. */
  k: number;
  /** Exponent — higher = steeper late-stint cliff. */
  p: number;
  /** Grip floor. */
  floor: number;
  /** Typical optimal stint length in laps (used for the UI bar scale). */
  optimalLife: number;
  /** Lap-time penalty in seconds at fully worn grip. */
  maxPenalty: number;
}

const MODELS: Record<Compound, DegModel> = {
  SOFT: { k: 0.018, p: 1.35, floor: 0.45, optimalLife: 18, maxPenalty: 2.4 },
  MEDIUM: { k: 0.011, p: 1.25, floor: 0.5, optimalLife: 28, maxPenalty: 1.8 },
  HARD: { k: 0.007, p: 1.15, floor: 0.55, optimalLife: 40, maxPenalty: 1.3 },
  INTERMEDIATE: { k: 0.014, p: 1.2, floor: 0.5, optimalLife: 22, maxPenalty: 2.0 },
  WET: { k: 0.012, p: 1.15, floor: 0.5, optimalLife: 26, maxPenalty: 1.9 },
  UNKNOWN: { k: 0.011, p: 1.25, floor: 0.5, optimalLife: 28, maxPenalty: 1.8 },
};

/** Remaining grip [floor, 1] for a tire of the given compound at `age` laps. */
export function gripAtAge(compound: Compound, age: number): number {
  const m = MODELS[compound];
  const grip = 1 - m.k * Math.pow(Math.max(0, age), m.p);
  return Math.max(m.floor, grip);
}

/**
 * Degradation fraction [0, 1] for the UI bar — 0 = fresh, 1 = fully worn.
 * Scaled so that a tire near its optimal life reads roughly full.
 */
export function degradation(compound: Compound, age: number): number {
  const m = MODELS[compound];
  const grip = gripAtAge(compound, age);
  const worn = (1 - grip) / (1 - m.floor);
  return Math.min(1, Math.max(0, worn));
}

/** Lap-time penalty in seconds attributable to tire wear at `age` laps. */
export function degPenalty(compound: Compound, age: number): number {
  const m = MODELS[compound];
  return degradation(compound, age) * m.maxPenalty;
}

/** Optimal stint length, used to scale the degradation bar in the tire widget. */
export function optimalLife(compound: Compound): number {
  return MODELS[compound].optimalLife;
}

/** Sample the grip curve across a stint for plotting. */
export function gripCurve(compound: Compound, laps: number): { age: number; grip: number }[] {
  const out: { age: number; grip: number }[] = [];
  for (let age = 0; age <= laps; age++) {
    out.push({ age, grip: gripAtAge(compound, age) });
  }
  return out;
}
