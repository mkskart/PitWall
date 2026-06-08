'use client';

import { useEffect, useRef } from 'react';
import { useRaceStore } from '@/store/raceStore';
import { SimEngine, simDrivers } from '@/lib/simEngine';
import { resolveCircuit, DEFAULT_CIRCUIT } from '@/lib/trackPaths';
import type { SessionInfo } from '@/lib/types';

interface SSEFrameRow {
  driverNumber: number;
  position: number;
  date: string;
  x: number | null;
  z: number | null;
}

/**
 * Drives the dashboard race state. Strategy:
 *
 *  1. Probe /api/sessions for the latest session and pick its circuit.
 *  2. If a session is genuinely LIVE, open the SSE feed and stream real order.
 *  3. Otherwise (off-season / API empty — the common case) run the deterministic
 *     SimEngine and flag the store as 'sim' so the header shows SIMULATION MODE.
 *
 * Either way the store ends up with a consistent set of drivers, car states,
 * running order, clock, and strategy data for the rest of the dashboard.
 */
export function useLiveRace() {
  const setMode = useRaceStore((s) => s.setMode);
  const setSession = useRaceStore((s) => s.setSession);
  const setCircuit = useRaceStore((s) => s.setCircuit);
  const setDrivers = useRaceStore((s) => s.setDrivers);
  const ingestFrame = useRaceStore((s) => s.ingestFrame);
  const setStrategy = useRaceStore((s) => s.setStrategy);

  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      let latest: SessionInfo | null = null;
      try {
        const res = await fetch('/api/sessions');
        const json = await res.json();
        latest = json.latest ?? null;
      } catch {
        latest = null;
      }
      if (cancelled) return;

      const circuit = latest
        ? resolveCircuit(latest.circuitShortName, latest.location, latest.country)
        : DEFAULT_CIRCUIT;
      setCircuit(circuit);
      setSession(latest);

      const live = latest?.isLive && latest.sessionKey != null;

      if (live && latest?.sessionKey != null) {
        const ok = startSSE(latest.sessionKey);
        if (ok) return;
      }

      startSim(circuit, latest);
    }

    function startSim(circuit = DEFAULT_CIRCUIT, session: SessionInfo | null = null) {
      if (cancelled) return;
      setMode('sim');
      setDrivers(simDrivers());
      const engine = new SimEngine(circuit, (session?.round ?? 1) * 7 + 3);
      const tickMs = 200;
      const timer = setInterval(() => {
        const frame = engine.tick(tickMs);
        ingestFrame({ ...frame, totalLaps: engine.totalLaps });
        const snap = engine.snapshot();
        setStrategy(snap);
      }, tickMs);
      cleanupRef.current = () => clearInterval(timer);
    }

    function startSSE(sessionKey: number): boolean {
      try {
        // Load real driver identities + strategy alongside the live order feed.
        void Promise.all([
          fetch(`/api/drivers?session_key=${sessionKey}`).then((r) => r.json()),
          fetch(`/api/stints?session_key=${sessionKey}`).then((r) => r.json()),
          fetch(`/api/pit?session_key=${sessionKey}`).then((r) => r.json()),
          fetch(`/api/laps?session_key=${sessionKey}`).then((r) => r.json()),
        ]).then(([d, st, p, lp]) => {
          if (cancelled) return;
          if (d?.drivers?.length) setDrivers(d.drivers);
          setStrategy({ stints: st?.stints ?? [], pits: p?.pits ?? [], laps: lp?.laps ?? [] });
        });

        setMode('live');
        const es = new EventSource(`/api/position?session_key=${sessionKey}&interval_ms=500`);
        const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };

        es.addEventListener('frame', (ev) => {
          const data = JSON.parse((ev as MessageEvent).data) as { order: SSEFrameRow[] };
          // Maintain running normalization bounds for the raw live coordinates.
          for (const r of data.order) {
            if (r.x != null) {
              bounds.minX = Math.min(bounds.minX, r.x);
              bounds.maxX = Math.max(bounds.maxX, r.x);
            }
            if (r.z != null) {
              bounds.minZ = Math.min(bounds.minZ, r.z);
              bounds.maxZ = Math.max(bounds.maxZ, r.z);
            }
          }
          const spanX = bounds.maxX - bounds.minX || 1;
          const spanZ = bounds.maxZ - bounds.minZ || 1;
          const span = Math.max(spanX, spanZ);
          const cx = (bounds.minX + bounds.maxX) / 2;
          const cz = (bounds.minZ + bounds.maxZ) / 2;

          const prev = useRaceStore.getState().cars;
          const cars = data.order.map((r) => {
            const existing = prev[r.driverNumber];
            const x = r.x != null && Number.isFinite(cx) ? ((r.x - cx) / span) * 2 : existing?.x ?? 0;
            const z = r.z != null && Number.isFinite(cz) ? ((r.z - cz) / span) * 2 : existing?.z ?? 0;
            return {
              driverNumber: r.driverNumber,
              x,
              z,
              position: r.position,
              progress: existing?.progress ?? 0,
              lapNumber: existing?.lapNumber ?? 0,
              lastLap: existing?.lastLap ?? null,
              bestLap: existing?.bestLap ?? null,
              gapToLeader: existing?.gapToLeader ?? null,
              speed: existing?.speed ?? 0,
              throttle: existing?.throttle ?? 0,
              brake: existing?.brake ?? 0,
              drs: existing?.drs ?? false,
              compound: existing?.compound ?? ('UNKNOWN' as const),
              tyreAge: existing?.tyreAge ?? 0,
              sector1: existing?.sector1 ?? null,
              sector2: existing?.sector2 ?? null,
              sector3: existing?.sector3 ?? null,
            };
          });
          ingestFrame({ cars, lap: useRaceStore.getState().clock.lap, elapsed: 0 });
        });

        es.addEventListener('empty', () => {
          es.close();
          if (!cancelled) startSim(useRaceStore.getState().circuit, useRaceStore.getState().session);
        });

        es.onerror = () => {
          // Network hiccup — fall back to the sim rather than freezing.
          es.close();
          if (!cancelled && useRaceStore.getState().mode === 'live') {
            startSim(useRaceStore.getState().circuit, useRaceStore.getState().session);
          }
        };

        cleanupRef.current = () => es.close();
        return true;
      } catch {
        return false;
      }
    }

    boot();
    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
