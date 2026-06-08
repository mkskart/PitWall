/**
 * raceStore — the single source of truth for live race state.
 *
 * The store is deliberately source-agnostic: it accepts frames from the live
 * SSE feed, the historical replay engine, OR the offline simulation engine.
 * Whatever is driving the race calls `ingestFrame` and the UI reacts.
 *
 * Performance note: car positions update up to 60fps. The 3D scene reads those
 * imperatively via `useRaceStore.getState().cars` inside its render loop rather
 * than subscribing, so high-frequency position updates never re-render React.
 * Lower-frequency slices (order, clock.lap, selectedDriver) are subscribed
 * normally and drive the timing tower / detail panel.
 */

import { create } from 'zustand';
import type {
  CarState,
  Driver,
  Lap,
  PitStop,
  RaceMode,
  SessionInfo,
  Stint,
} from '@/lib/types';
import type { CircuitPath } from '@/lib/trackPaths';
import { DEFAULT_CIRCUIT } from '@/lib/trackPaths';

export interface RaceState {
  mode: RaceMode;
  session: SessionInfo | null;
  circuit: CircuitPath;
  drivers: Driver[];
  driversByNumber: Record<number, Driver>;

  /** High-frequency car state, keyed by driver number. */
  cars: Record<number, CarState>;
  /** Driver numbers in running order (P1 first). Changes only on overtakes. */
  order: number[];

  clock: { elapsed: number; lap: number; totalLaps: number };

  // Strategy / history for the timeline + panels.
  stints: Stint[];
  pits: PitStop[];
  laps: Lap[];

  selectedDriver: number | null;

  // ── actions ──
  setMode: (mode: RaceMode) => void;
  setSession: (session: SessionInfo | null) => void;
  setCircuit: (circuit: CircuitPath) => void;
  setDrivers: (drivers: Driver[]) => void;
  ingestFrame: (frame: { cars: CarState[]; lap: number; elapsed: number; totalLaps?: number }) => void;
  setStrategy: (data: { stints?: Stint[]; pits?: PitStop[]; laps?: Lap[] }) => void;
  selectDriver: (driverNumber: number | null) => void;
  reset: () => void;
}

function ordersEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export const useRaceStore = create<RaceState>((set, get) => ({
  mode: 'idle',
  session: null,
  circuit: DEFAULT_CIRCUIT,
  drivers: [],
  driversByNumber: {},
  cars: {},
  order: [],
  clock: { elapsed: 0, lap: 0, totalLaps: 0 },
  stints: [],
  pits: [],
  laps: [],
  selectedDriver: null,

  setMode: (mode) => set({ mode }),
  setSession: (session) => set({ session }),
  setCircuit: (circuit) => set({ circuit }),

  setDrivers: (drivers) =>
    set({
      drivers,
      driversByNumber: Object.fromEntries(drivers.map((d) => [d.driverNumber, d])),
    }),

  ingestFrame: (frame) => {
    const prev = get();
    const cars: Record<number, CarState> = {};
    for (const c of frame.cars) cars[c.driverNumber] = c;

    // Derive running order from positions; only replace the array when it
    // actually changed so subscribers (the timing tower) don't churn.
    const nextOrder = [...frame.cars].sort((a, b) => a.position - b.position).map((c) => c.driverNumber);
    const order = ordersEqual(prev.order, nextOrder) ? prev.order : nextOrder;

    set({
      cars,
      order,
      clock: {
        elapsed: frame.elapsed,
        lap: frame.lap,
        totalLaps: frame.totalLaps ?? prev.clock.totalLaps,
      },
    });
  },

  setStrategy: (data) =>
    set((s) => ({
      stints: data.stints ?? s.stints,
      pits: data.pits ?? s.pits,
      laps: data.laps ?? s.laps,
    })),

  selectDriver: (driverNumber) => set({ selectedDriver: driverNumber }),

  reset: () =>
    set({
      mode: 'idle',
      cars: {},
      order: [],
      clock: { elapsed: 0, lap: 0, totalLaps: 0 },
      stints: [],
      pits: [],
      laps: [],
      selectedDriver: null,
    }),
}));

// Convenience selectors (stable references for useShallow-style subscriptions).
export const selectOrder = (s: RaceState) => s.order;
export const selectClock = (s: RaceState) => s.clock;
export const selectSelected = (s: RaceState) => s.selectedDriver;
export const selectMode = (s: RaceState) => s.mode;
