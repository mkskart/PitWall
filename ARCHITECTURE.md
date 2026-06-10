# PitWall — Architecture

A short tour of how data moves through the app and how the three race-state
sources (live SSE, replay engine, simulation) share one pipeline.

## Data flow

```
                       ┌──────────────────────────── server ────────────────────────────┐
  OpenF1 API ──────────►  lib/openf1.ts ──┐
  (live + 2023+ hist.)    (Zod-validated) │
                                          ├──►  app/api/* route handlers ──► JSON / SSE
  Jolpica (Ergast API) ─►  lib/ergast.ts ─┘     (TTL caching per route)
  (pre-2023, standings)   (Zod-validated)
                       └─────────────────────────────────────────────────────────────────┘
                                               │
                              ┌────────────────┼─────────────────┐
                              ▼                ▼                 ▼
                      TanStack Query    EventSource (SSE)   fetch (boot probe)
                      (historical,      /api/position       /api/sessions
                       staleTime: ∞)         │                   │
                              │              ▼                   ▼
                              │      hooks/useLiveRace ─── mode decision:
                              │        live? → stream      no data? → SimEngine
                              │              │                   │
                              ▼              ▼                   ▼
                          components   store/raceStore  ◄── lib/simEngine
                          (charts,     (Zustand, source-     lib/replayEngine
                           tables)      agnostic frames)         ▲
                                             │                   │
                              ┌──────────────┤            hooks/useReplay
                              ▼              ▼
                      timing tower     R3F track scene
                      (subscribes      (reads store imperatively
                       to slices)       in useFrame — zero React
                                        re-renders at 60fps)
```

Key boundary rule: **the browser never talks to OpenF1/Jolpica directly.**
All upstream polling, caching, validation, and fallback live in the API
routes, so rate limits and shape drift are handled in exactly one place.

## Validation at the boundary

Every upstream response is parsed with Zod (`lib/schemas.ts`). Invalid rows
are dropped one-by-one — a single malformed record must not blank a 20-car
timing screen — and each drop is logged loudly in development so shape drift
is caught early. All fetches go through `lib/fetcher.ts`: 8s timeout per
attempt, up to 3 retries with exponential backoff + jitter, `Retry-After`
honored on 429s, and a `null` return (never a throw) so callers degrade
deliberately.

## The three race-state sources

`store/raceStore.ts` is source-agnostic: whatever is driving the race calls
`ingestFrame({ cars, lap, elapsed })` and every view reacts identically.

1. **Live (SSE)** — `/api/position` polls OpenF1 server-side every 500ms.
   The first poll takes a full snapshot; subsequent polls fetch only rows
   newer than the last seen timestamp (delta polling — late in a race the
   full position table is megabytes). Merged frames are pushed as SSE
   `frame` events; `hb` heartbeats fire every 15s. The client
   (`hooks/useLiveRace.ts`) auto-reconnects with exponential backoff and a
   45s stall watchdog.

2. **Simulation** — when OpenF1 has no data (off-season, outage, no live
   session — the default for most visitors) the server emits a single
   `empty` event and the client spins up `lib/simEngine.ts`: a deterministic
   (seeded PRNG) 20-car race with per-driver pace, tire-degradation curves
   (`lib/tireDeg.ts`), and one/two-stop strategies. The UI labels this state
   SIMULATION MODE — it is never presented as real data.

3. **Replay** — `hooks/useReplay.ts` builds a timeline of timestamped
   per-driver samples, advances an elapsed clock at `speed × real time`, and
   asks `lib/replayEngine.ts` for the state at that instant. The engine
   binary-searches each driver's sample array for the bracketing pair and
   interpolates. Scrubbing is just `stateAt(t)` — fully random-access.

## Replay timing details

- Samples store fractional lap `progress`; interpolation handles the
  0.98 → 0.02 wrap across the start/finish line explicitly.
- Interpolated car positions are derived from `progress` along the circuit
  geometry (`pointAt`), not by lerping raw x/z — straight-line lerp visibly
  cuts corners through hairpins at coarse sample intervals.
- Track polylines are **arc-length re-spaced** at build time
  (`lib/trackPaths/_spline.ts`): equal progress steps cover equal distance,
  so cars don't surge through sparsely-anchored straights.
- React-facing playback state is throttled to ~12Hz; the 3D scene reads the
  store imperatively at full rate.

## Rendering performance

- The R3F scene draws all 20 cars + glows + 160 trail segments in **three
  instanced draw calls** (`components/track/InstancedCars.tsx`). Per-instance
  trail fade abuses additive blending: scaling instance color toward black is
  equivalent to per-instance opacity, which `InstancedMesh` doesn't support.
- Car transforms are mutated in `useFrame` from `useRaceStore.getState()` —
  high-frequency position data never passes through React state.
- The render loop pauses (`frameloop="never"`) while the tab is hidden.
- The timing tower subscribes only to the running-order array (changes on
  overtakes); each row owns a shallow-compared subscription to its rounded,
  displayed values, so a 60fps stream re-renders nothing until a visible
  number actually changes.

## Verification

`scripts/verify-engines.ts` (run with `npx tsx scripts/verify-engines.ts`)
executes the entire pure-logic layer headlessly: all 19 circuit geometries,
sim-engine invariants (unique positions, monotonic gaps, realistic lap times,
pit/stint consistency, determinism per seed), and replay-engine behavior
(idempotent scrubbing, interpolation smoothness, backward seeks).
