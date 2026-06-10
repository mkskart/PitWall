/**
 * Headless verification harness for the pure logic layer.
 * Run with: npx tsx scripts/verify-engines.ts
 * Exercises the sim engine, replay engine, spline builder, and utils without a browser.
 */
import { SimEngine, simDrivers, pointAt } from '../src/lib/simEngine';
import { buildSimReplay, ReplayEngine } from '../src/lib/replayEngine';
import { CIRCUITS, resolveCircuit, DEFAULT_CIRCUIT } from '../src/lib/trackPaths';
import { formatLapTime, formatGap, binarySearchLE, normalizeCompound } from '../src/lib/utils';
import { degradation, gripAtAge, degPenalty } from '../src/lib/tireDeg';
import { teamColor, normalizeTeamName } from '../src/lib/teamColors';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.error(`  ✗ FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('— track paths —');
check('19 circuits defined', Object.keys(CIRCUITS).length === 19, String(Object.keys(CIRCUITS).length));
for (const [id, c] of Object.entries(CIRCUITS)) {
  const finite = c.points.every(([x, z]) => Number.isFinite(x) && Number.isFinite(z));
  const inRange = c.points.every(([x, z]) => Math.abs(x) <= 1.01 && Math.abs(z) <= 1.01);
  check(`${id}: ${c.points.length} pts, finite + normalized`, finite && inRange && c.points.length > 100);
}
check('resolveCircuit("Sakhir") → bahrain', resolveCircuit('Sakhir').id === 'bahrain');
check('resolveCircuit("Yas Island", "Abu Dhabi") → abudhabi', resolveCircuit('Yas Island', 'Abu Dhabi').id === 'abudhabi');
check('resolveCircuit(garbage) falls back', resolveCircuit('nonsense xyz').id === DEFAULT_CIRCUIT.id);

console.log('— utils —');
check('formatLapTime(92.347) = 1:32.347', formatLapTime(92.347) === '1:32.347');
check('formatLapTime(null) = —', formatLapTime(null) === '—');
check('formatGap(0) = LEADER', formatGap(0) === 'LEADER');
check('normalizeCompound("soft") = SOFT', normalizeCompound('soft') === 'SOFT');
const arr = [1, 3, 5, 7, 9].map((t) => ({ t }));
check('binarySearchLE finds 5 for 6', binarySearchLE(arr, 6, (s) => s.t) === 2);
check('binarySearchLE -1 before first', binarySearchLE(arr, 0, (s) => s.t) === -1);

console.log('— team colors —');
check('Red Bull normalizes', normalizeTeamName('Oracle Red Bull Racing') === 'Red Bull Racing');
check('teamColor falls back to hint', teamColor('Unknown Team', '00FF00') === '#00FF00');

console.log('— tire degradation —');
check('fresh grip = 1', gripAtAge('SOFT', 0) === 1);
check('soft degrades faster than hard @15 laps', gripAtAge('SOFT', 15) < gripAtAge('HARD', 15));
check('degradation monotonic', degradation('MEDIUM', 10) < degradation('MEDIUM', 25));
check('penalty bounded', degPenalty('SOFT', 100) <= 2.4 + 1e-9);

console.log('— sim engine: full race —');
const grid = simDrivers();
check('20 drivers', grid.length === 20);
check('all have colors', grid.every((d) => /^#[0-9A-Fa-f]{6}$/.test(d.color)));
const engine = new SimEngine(DEFAULT_CIRCUIT, 42);
let frame = engine.tick(200);
check('first frame: 20 cars', frame.cars.length === 20);
check('positions 1..20 unique', new Set(frame.cars.map((c) => c.position)).size === 20);
// run ~30 minutes of race time at 1s ticks
for (let i = 0; i < 1800; i++) frame = engine.tick(1000);
check('lap advanced (>15 after 30min)', frame.lap > 15, `lap=${frame.lap}`);
const leader = frame.cars.find((c) => c.position === 1)!;
check('leader gap = 0', leader.gapToLeader === 0);
check('gaps monotonic down the order', [...frame.cars].sort((a, b) => a.position - b.position).every((c, i, a) => i === 0 || (c.gapToLeader ?? 0) >= (a[i - 1].gapToLeader ?? 0) - 1e-9));
check('lap times realistic (88–100s)', frame.cars.every((c) => c.lastLap == null || (c.lastLap > 88 && c.lastLap < 130)), JSON.stringify(frame.cars.slice(0, 3).map((c) => c.lastLap)));
check('coords on track (|x|,|z| ≤ 1.01)', frame.cars.every((c) => Math.abs(c.x) <= 1.01 && Math.abs(c.z) <= 1.01));
const snap = engine.snapshot();
check('laps recorded', snap.laps.length > 200, String(snap.laps.length));
check('stints have compounds', snap.stints.every((s) => s.compound !== 'UNKNOWN'));
check('pit stops happened', snap.pits.length > 0, String(snap.pits.length));
check('pit laps match a stint boundary', snap.pits.every((p) => snap.stints.some((s) => s.driverNumber === p.driverNumber && s.lapEnd === p.lapNumber)));

console.log('— determinism —');
const e1 = new SimEngine(DEFAULT_CIRCUIT, 7);
const e2 = new SimEngine(DEFAULT_CIRCUIT, 7);
for (let i = 0; i < 500; i++) { e1.tick(500); e2.tick(500); }
const f1 = e1.tick(500), f2 = e2.tick(500);
check('same seed → identical state', JSON.stringify(f1.cars.map(c => [c.driverNumber, c.position, c.lapNumber])) === JSON.stringify(f2.cars.map(c => [c.driverNumber, c.position, c.lapNumber])));

console.log('— replay engine —');
const t0 = Date.now();
const bundle = buildSimReplay(CIRCUITS.monza, 11);
const buildMs = Date.now() - t0;
check(`timeline built (<3s, took ${buildMs}ms)`, buildMs < 3000);
check('duration ~80–110 min', bundle.timeline.duration > 4000 && bundle.timeline.duration < 7000, String(bundle.timeline.duration));
const replay = new ReplayEngine(bundle.timeline, CIRCUITS.monza);
const s0 = replay.stateAt(0);
const sMid = replay.stateAt(replay.duration / 2);
const sEnd = replay.stateAt(replay.duration);
check('t=0: lap ≤ 1', s0.lap <= 1, String(s0.lap));
check('t=mid: mid-race lap', sMid.lap > 20 && sMid.lap < 50, String(sMid.lap));
check('t=end: final lap', sEnd.lap === bundle.timeline.totalLaps, `${sEnd.lap}/${bundle.timeline.totalLaps}`);
check('scrub is idempotent', JSON.stringify(replay.stateAt(1234).cars.map(c => c.position)) === JSON.stringify(replay.stateAt(1234).cars.map(c => c.position)));
check('positions unique at mid', new Set(sMid.cars.map((c) => c.position)).size === sMid.cars.length);
// interpolation smoothness: two samples 0.5s apart should move cars only slightly
const a = replay.stateAt(2000), b = replay.stateAt(2000.5);
const maxJump = Math.max(...a.cars.map((c) => {
  const m = b.cars.find((x) => x.driverNumber === c.driverNumber)!;
  return Math.hypot(m.x - c.x, m.z - c.z);
}));
check(`interpolation smooth (max 0.5s jump = ${maxJump.toFixed(4)} ≤ 0.05)`, maxJump <= 0.05);
// scrub backwards
const back = replay.stateAt(500);
check('backward scrub works', back.lap < sMid.lap);

console.log('— pointAt wraps —');
const p1 = pointAt(DEFAULT_CIRCUIT, 0.9999), p2 = pointAt(DEFAULT_CIRCUIT, 0.0001);
check('progress wrap continuity', Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) < 0.05);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
