'use client';

import { useEffect } from 'react';
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

/** No frame OR heartbeat for this long → treat the stream as silently dead. */
const STALL_MS = 45_000;
const MAX_RECONNECT_DELAY = 30_000;

/**
 * Drives the dashboard race state. Strategy:
 *
 *  1. Probe /api/sessions for the latest session and pick its circuit.
 *  2. If a session is genuinely LIVE, open the SSE feed and stream real order.
 *     The connection auto-reconnects with exponential backoff and a watchdog
 *     detects silent stalls (no frame/heartbeat for 45s).
 *  3. Otherwise (off-season / API empty — the common case) run the
 *     deterministic SimEngine and flag the store as 'sim' so the header shows
 *     SIMULATION MODE.
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

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    let simTimer: ReturnType<typeof setInterval> | null = null;
    let watchdog: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let lastMessageAt = 0;

    const teardownStream = () => {
      es?.close();
      es = null;
      if (watchdog) clearInterval(watchdog);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      watchdog = null;
      reconnectTimer = null;
    };

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

      if (latest?.isLive && latest.sessionKey != null) {
        connect(latest.sessionKey);
      } else {
        startSim(circuit, latest);
      }
    }

    function startSim(circuit = DEFAULT_CIRCUIT, session: SessionInfo | null = null) {
      if (cancelled || simTimer) return;
      teardownStream();
      setMode('sim');
      setDrivers(simDrivers());
      const engine = new SimEngine(circuit, (session?.round ?? 1) * 7 + 3);
      const tickMs = 200;
      let lastStrategyLap = -1;
      simTimer = setInterval(() => {
        const frame = engine.tick(tickMs);
        ingestFrame({ ...frame, totalLaps: engine.totalLaps });
        // Strategy arrays only change when someone completes a lap — pushing
        // them every tick would re-render the whole timeline at 5Hz.
        if (frame.lap !== lastStrategyLap) {
          lastStrategyLap = frame.lap;
          setStrategy(engine.snapshot());
        }
      }, tickMs);
    }

    function loadSessionData(sessionKey: number) {
      void Promise.all([
        fetch(`/api/drivers?session_key=${sessionKey}`).then((r) => r.json()),
        fetch(`/api/stints?session_key=${sessionKey}`).then((r) => r.json()),
        fetch(`/api/pit?session_key=${sessionKey}`).then((r) => r.json()),
        fetch(`/api/laps?session_key=${sessionKey}`).then((r) => r.json()),
      ])
        .then(([d, st, p, lp]) => {
          if (cancelled) return;
          if (d?.drivers?.length) setDrivers(d.drivers);
          setStrategy({ stints: st?.stints ?? [], pits: p?.pits ?? [], laps: lp?.laps ?? [] });
        })
        .catch(() => {
          /* identity/strategy panels degrade; the position stream still works */
        });
    }

    function connect(sessionKey: number) {
      if (cancelled) return;
      teardownStream();
      setMode('live');
      loadSessionData(sessionKey);

      // Running normalization bounds for raw live coordinates (persist across
      // reconnects so the map doesn't re-scale mid-session).
      const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };

      const open = () => {
        if (cancelled) return;
        es = new EventSource(`/api/position?session_key=${sessionKey}&interval_ms=500`);
        lastMessageAt = Date.now();

        es.addEventListener('hb', () => {
          lastMessageAt = Date.now();
        });

        es.addEventListener('frame', (ev) => {
          lastMessageAt = Date.now();
          reconnectAttempt = 0; // healthy again
          const data = JSON.parse((ev as MessageEvent).data) as { order: SSEFrameRow[] };
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
          // No OpenF1 data for this session — simulate instead; do not retry.
          teardownStream();
          startSim(useRaceStore.getState().circuit, useRaceStore.getState().session);
        });

        es.onerror = () => {
          // Connection lost — EventSource's built-in retry is replaced with
          // controlled exponential backoff so a dead server isn't hammered.
          es?.close();
          es = null;
          if (cancelled) return;
          const delay = Math.min(MAX_RECONNECT_DELAY, 1000 * 2 ** reconnectAttempt);
          reconnectAttempt++;
          reconnectTimer = setTimeout(open, delay);
        };
      };

      open();

      // Watchdog: heartbeats arrive every 15s; total silence for 45s means the
      // connection is zombie — force a reconnect cycle.
      watchdog = setInterval(() => {
        if (cancelled || !es) return;
        if (Date.now() - lastMessageAt > STALL_MS) {
          es.close();
          es = null;
          const delay = Math.min(MAX_RECONNECT_DELAY, 1000 * 2 ** reconnectAttempt);
          reconnectAttempt++;
          reconnectTimer = setTimeout(open, delay);
        }
      }, 10_000);
    }

    boot();
    return () => {
      cancelled = true;
      teardownStream();
      if (simTimer) clearInterval(simTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
