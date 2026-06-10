/**
 * Track path utilities.
 *
 * Real F1 telemetry traces (from OpenF1's /location endpoint) are thousands of
 * raw (x, y) samples per lap. Shipping those verbatim for 19 circuits would be
 * megabytes of data. Instead each circuit is authored as a compact set of
 * normalized anchor points that capture its characteristic shape, and we expand
 * them at module-load time into a dense, smooth closed loop with a Catmull-Rom
 * spline. The result is a recognizable racing line in normalized [-1, 1] space.
 */

export type Vec2 = [number, number];

/** Catmull-Rom interpolation between p1 and p2 (p0/p3 are neighbors), t in [0,1]. */
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/**
 * Expand a closed loop of anchor points into `samplesPerSegment` points per
 * segment using a centripetal-ish Catmull-Rom spline. The loop is treated as
 * cyclic so the start/end join smoothly.
 */
export function resampleClosed(anchors: Vec2[], samplesPerSegment = 16): Vec2[] {
  const n = anchors.length;
  if (n < 3) return anchors.slice();
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = anchors[(i - 1 + n) % n];
    const p1 = anchors[i];
    const p2 = anchors[(i + 1) % n];
    const p3 = anchors[(i + 2) % n];
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      out.push([catmullRom(p0[0], p1[0], p2[0], p3[0], t), catmullRom(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }
  return out;
}

/** Normalize a point set into roughly [-1, 1] on both axes, preserving aspect. */
export function normalizePoints(points: Vec2[]): Vec2[] {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const span = Math.max(spanX, spanY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return points.map(([x, y]) => [((x - cx) / span) * 2, ((y - cy) / span) * 2]);
}

/**
 * Re-space a closed polyline to `n` points at uniform arc-length intervals.
 * Catmull-Rom output clusters points near dense anchor runs (tight corners),
 * which would make equal index steps cover unequal real distance — cars would
 * visibly surge and crawl. After this pass, fractional lap progress maps
 * linearly onto distance along the track.
 */
export function respaceUniform(points: Vec2[], n = 360): Vec2[] {
  const m = points.length;
  if (m < 3) return points.slice();
  // Cumulative arc length around the closed loop.
  const cum: number[] = [0];
  for (let i = 1; i <= m; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i % m];
    cum.push(cum[i - 1] + Math.hypot(bx - ax, by - ay));
  }
  const total = cum[m];
  const out: Vec2[] = [];
  let seg = 0;
  for (let k = 0; k < n; k++) {
    const target = (k / n) * total;
    while (seg < m - 1 && cum[seg + 1] < target) seg++;
    const span = cum[seg + 1] - cum[seg] || 1;
    const f = (target - cum[seg]) / span;
    const [ax, ay] = points[seg];
    const [bx, by] = points[(seg + 1) % m];
    out.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
  }
  return out;
}

/** Build a finished, normalized, uniformly-spaced closed track from anchors. */
export function buildTrack(anchors: Vec2[], samplesPerSegment = 16): Vec2[] {
  const dense = resampleClosed(normalizePoints(anchors), samplesPerSegment);
  return normalizePoints(respaceUniform(dense, 360));
}

export interface CircuitPath {
  id: string;
  name: string;
  country: string;
  /** Dense normalized [x, z] waypoints forming a closed loop. */
  points: Vec2[];
  /** Fractional positions [0,1) of the three sector boundaries along the lap. */
  sectors: [number, number, number];
  /** DRS zones as [startFrac, endFrac] ranges along the lap. */
  drsZones: [number, number][];
}
