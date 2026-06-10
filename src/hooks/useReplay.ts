'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRaceStore } from '@/store/raceStore';
import { ReplayEngine, buildSimReplay } from '@/lib/replayEngine';
import { resolveCircuit, DEFAULT_CIRCUIT } from '@/lib/trackPaths';
import { simDrivers } from '@/lib/simEngine';
import type { Driver, SessionInfo } from '@/lib/types';

export const PLAYBACK_SPEEDS = [1, 5, 20, 50] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export interface ReplayController {
  ready: boolean;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  elapsed: number;
  duration: number;
  totalLaps: number;
  lap: number;
  session: SessionInfo | null;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  setSpeed: (s: PlaybackSpeed) => void;
  seek: (t: number) => void;
  seekBy: (deltaSeconds: number) => void;
  jumpLap: (direction: 1 | -1) => void;
}

/**
 * Replay controller. Resolves the session for {year, round}, loads real driver
 * identities + strategy where available, and builds a deterministic, fully
 * scrubbable timeline. The internal animation loop advances an elapsed clock at
 * `speed × real time`, asks the ReplayEngine for the interpolated state at that
 * instant (binary search + lerp), and pushes it into the shared race store at
 * up to 60fps. UI-facing `elapsed` is throttled to ~15Hz to avoid re-render
 * storms while the 3D scene reads the store imperatively.
 */
export function useReplay(year: number, round: number): ReplayController {
  const setMode = useRaceStore((s) => s.setMode);
  const setSession = useRaceStore((s) => s.setSession);
  const setCircuit = useRaceStore((s) => s.setCircuit);
  const setDrivers = useRaceStore((s) => s.setDrivers);
  const ingestFrame = useRaceStore((s) => s.ingestFrame);
  const setStrategy = useRaceStore((s) => s.setStrategy);

  const engineRef = useRef<ReplayEngine | null>(null);
  const elapsedRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [isPlaying, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(5);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [totalLaps, setTotalLaps] = useState(0);
  const [lap, setLap] = useState(0);
  const [session, setSessionState] = useState<SessionInfo | null>(null);

  // Load + build the timeline whenever the round changes.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setPlaying(false);
    elapsedRef.current = 0;

    async function load() {
      let found: SessionInfo | null = null;
      let drivers: Driver[] = [];
      try {
        const res = await fetch(`/api/sessions?year=${year}`);
        const json = await res.json();
        const sessions: SessionInfo[] = json.sessions ?? [];
        found =
          sessions.find((s) => s.round === round && /race/i.test(s.type || s.name)) ??
          sessions.find((s) => s.round === round) ??
          sessions[round - 1] ??
          null;
      } catch {
        found = null;
      }

      const circuit = found
        ? resolveCircuit(found.circuitShortName, found.location, found.country)
        : DEFAULT_CIRCUIT;

      // Real strategy + identities when OpenF1 covers this session.
      let realStints: unknown[] = [];
      let realPits: unknown[] = [];
      let realLaps: unknown[] = [];
      if (found?.sessionKey != null) {
        try {
          const [d, st, p, lp] = await Promise.all([
            fetch(`/api/drivers?session_key=${found.sessionKey}`).then((r) => r.json()),
            fetch(`/api/stints?session_key=${found.sessionKey}`).then((r) => r.json()),
            fetch(`/api/pit?session_key=${found.sessionKey}`).then((r) => r.json()),
            fetch(`/api/laps?session_key=${found.sessionKey}`).then((r) => r.json()),
          ]);
          drivers = d?.drivers ?? [];
          realStints = st?.stints ?? [];
          realPits = p?.pits ?? [];
          realLaps = lp?.laps ?? [];
        } catch {
          /* fall through to sim */
        }
      }

      if (cancelled) return;

      const bundle = buildSimReplay(circuit, round * 7 + 3);
      engineRef.current = new ReplayEngine(bundle.timeline, circuit);

      if (!drivers.length) drivers = simDrivers();

      setMode('replay');
      setCircuit(circuit);
      setSession(found);
      setSessionState(found);
      setDrivers(drivers);
      setStrategy({
        stints: (realStints.length ? realStints : bundle.stints) as never,
        pits: (realPits.length ? realPits : bundle.pits) as never,
        laps: (realLaps.length ? realLaps : bundle.laps) as never,
      });

      setDuration(bundle.timeline.duration);
      setTotalLaps(bundle.timeline.totalLaps);

      // Seed the very first frame so the scene isn't empty before play.
      const first = engineRef.current.stateAt(0);
      ingestFrame(first);
      setLap(first.lap);
      setReady(true);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, round]);

  // Animation loop. The 3D scene reads the store imperatively at full rate;
  // React-facing `elapsed`/`lap` state is throttled to ~12Hz so the playback
  // UI doesn't re-render the page tree 60 times a second.
  useEffect(() => {
    if (!isPlaying || !ready) return;
    lastTsRef.current = null;
    let lastUiElapsed = -Infinity;

    const tick = (ts: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      let next = elapsedRef.current + dt * speed;
      if (next >= engine.duration) {
        next = engine.duration;
      }
      elapsedRef.current = next;

      const frame = engine.stateAt(next);
      ingestFrame(frame);
      if (next - lastUiElapsed > 0.08 || next >= engine.duration) {
        lastUiElapsed = next;
        setElapsed(next);
        setLap(frame.lap);
      }

      if (next >= engine.duration) {
        setPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, ready, speed, ingestFrame]);

  const seek = useCallback(
    (t: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      const clamped = Math.max(0, Math.min(engine.duration, t));
      elapsedRef.current = clamped;
      const frame = engine.stateAt(clamped);
      ingestFrame(frame);
      setElapsed(clamped);
      setLap(frame.lap);
    },
    [ingestFrame],
  );

  /** Seek relative to the current position (keyboard arrows). */
  const seekBy = useCallback((deltaSeconds: number) => seek(elapsedRef.current + deltaSeconds), [seek]);

  /** Jump forward/back one full lap ([ and ] keys). */
  const jumpLap = useCallback(
    (direction: 1 | -1) => {
      const engine = engineRef.current;
      if (!engine || engine.totalLaps <= 0) return;
      const lapDuration = engine.duration / engine.totalLaps;
      seek(elapsedRef.current + direction * lapDuration);
    },
    [seek],
  );

  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const setSpeed = useCallback((s: PlaybackSpeed) => setSpeedState(s), []);

  return {
    ready,
    isPlaying,
    speed,
    elapsed,
    duration,
    totalLaps,
    lap,
    session,
    toggle,
    play,
    pause,
    setSpeed,
    seek,
    seekBy,
    jumpLap,
  };
}
