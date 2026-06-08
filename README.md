# PitWall

**A full-stack Formula 1 telemetry & analytics platform — live timing, a real-time 3D track map, an interpolated race-replay engine, and head-to-head driver comparison.**

![PitWall dashboard](docs/hero.svg)

> _Hero screenshot: the live dashboard — timing tower on the left, a 3D track map with glowing team-colored cars and motion trails in the center, a driver telemetry panel on the right, and a full-width pit-strategy timeline along the bottom._

---

## Overview

PitWall is a portfolio piece I built to push myself on the hard parts of a modern data-heavy web app: streaming real-time data to the browser, rendering and animating a 3D scene at 60fps without thrashing React, and designing an interpolation engine that can scrub through an entire race like a video editor. It pulls live and historical data from the [OpenF1](https://openf1.org) API, falls back to [Ergast](https://ergast.com/mrd/) for older seasons and championship data, and degrades gracefully to a deterministic simulation engine when no session is live — so the app is always alive, never a blank screen.

Everything is typed end-to-end, every API call is cached with an appropriate TTL, and the entire visual language is a single, deliberate design system: monospaced telemetry numerals, sharp 1px-bordered instrument panels, and team-color-only accents.

## Features

- **Dashboard (live)** — A live timing tower that animates position changes, a 3D track map where each car is a glowing team-colored sphere with a fading motion trail, a driver detail panel (lap deltas, sector chips, tire degradation, throttle/brake, DRS, speed trap), and a pit-strategy timeline for the full grid. Real-time updates arrive over Server-Sent Events.
- **Replay** — Load any historical round and scrub through it. A binary-search interpolation engine resolves the exact, smoothly-interpolated state of every car at any instant, with 1×/5×/20×/50× playback and a draggable timeline.
- **Standings** — Driver and constructor championships with points-delta bars, plus a full season calendar: completed rounds show their podium, upcoming rounds show a live countdown.
- **Compare** — Head-to-head telemetry: overlaid lap-time charts, a four-channel single-lap telemetry overlay (speed / throttle / brake / gear) with a synced cursor, a mini-sector heatmap, and a pit-strategy comparison with automatic undercut detection.

## Architecture

| Concern | Approach |
| --- | --- |
| **Live data** | Server-Sent Events. A Next.js route polls OpenF1 server-side every 500ms and pushes merged position/location frames to the browser over a `ReadableStream`. The browser never talks to OpenF1 directly. |
| **Dual data source** | OpenF1 is primary (2023+, live + historical). Ergast is a documented *cold fallback only* for pre-2023 seasons, standings, and the calendar — it is being deprecated, so the app treats it as best-effort and normalizes both sources behind a single typed domain model. |
| **3D rendering** | React Three Fiber. Car positions are mutated directly on `THREE.Mesh` refs inside the render loop and read imperatively from the store — never through React state — so a 60fps position stream causes zero React re-renders. |
| **Replay engine** | Timestamped per-driver sample arrays are binary-searched for the bracketing pair at the target time and linearly interpolated (with wrap-around handling across the start/finish line). The same machinery runs over real OpenF1 data or a deterministic simulation. |
| **State** | A single source-agnostic Zustand store ingests frames from SSE, the replay engine, or the simulation. The timing tower subscribes only to the running-order array (changes on overtakes); each row owns a shallow-compared subscription to its own displayed values. |
| **Caching** | TanStack Query caches historical data aggressively (`staleTime: Infinity` for completed sessions); API routes set explicit `Cache-Control` / `revalidate` TTLs — 500ms for live, up to an hour for historical. |
| **Simulation fallback** | When OpenF1 returns nothing, a deterministic engine generates a believable race (2024 grid, tire-degradation curves, pit strategy). It is always clearly labelled **SIMULATION MODE** and never presented as real data. |

### Project layout

```
src/
  app/            App Router pages (dashboard, replay, standings, compare) + API routes
  components/     nav · dashboard · track (R3F) · replay · standings · compare · ui
  hooks/          useLiveRace (SSE + sim), useReplay (playback engine), data queries
  store/          raceStore — Zustand, source-agnostic
  lib/            openf1 + ergast clients, types, teamColors, tireDeg,
                  replayEngine, simEngine, trackPaths/ (19 precomputed circuits)
```

## Tech stack

![Next.js](https://img.shields.io/badge/Next.js_14-000?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React Three Fiber](https://img.shields.io/badge/React_Three_Fiber-000?logo=three.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-2D3748)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?logo=reactquery&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?logo=framer&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-22B5BF)

- **Framework:** Next.js 14 (App Router), TypeScript
- **3D / viz:** React Three Fiber, @react-three/drei, Three.js
- **UI / animation:** Tailwind CSS, Framer Motion, Recharts, lucide-react
- **State / data:** Zustand, TanStack Query, axios, date-fns
- **Backend:** Next.js API routes (Vercel-ready)

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (defaults work out of the box)
cp .env.example .env.local

# 3. Run the dev server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

```bash
npm run build      # production build
npm run typecheck  # strict TypeScript check
npm run lint       # Next.js lint
```

### Environment variables

```
OPENF1_BASE_URL=https://api.openf1.org/v1
ERGAST_BASE_URL=https://ergast.com/api/f1
NEXT_PUBLIC_APP_NAME=PitWall
```

## Data sources

- **[OpenF1](https://openf1.org)** — primary source for live and historical timing, position, car telemetry, pit, and stint data.
- **[Ergast Developer API](https://ergast.com/mrd/)** — cold fallback for pre-2023 seasons, championship standings, and the race calendar. Ergast is being deprecated; PitWall uses it only as a best-effort secondary source and is designed to keep working as that data ages out.

Track outlines are authored as compact normalized anchor points and expanded into smooth closed loops with a Catmull-Rom spline at load time, covering 19 circuits.

---

_Built by Kartheek M. F1 data © their respective providers; this project is an independent, non-commercial portfolio piece and is not affiliated with Formula 1._
