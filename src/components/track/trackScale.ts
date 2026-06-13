/** Shared mapping from normalized [-1,1] track space into the R3F world. */
import * as THREE from 'three';
import type { Vec2 } from '@/lib/trackPaths';

export const TRACK_SCALE = 12;
export const CAR_RADIUS = TRACK_SCALE * 0.015;

/** Half-width of the rendered asphalt ribbon, in world units. */
export const ROAD_HALF = TRACK_SCALE * 0.035;
/** Full length of a rendered car, in world units. */
export const CAR_LEN = TRACK_SCALE * 0.06;

/** Normalized (x, z) → world [x, y, z] on the ground plane. */
export function worldPos(x: number, z: number): [number, number, number] {
  return [x * TRACK_SCALE, 0, z * TRACK_SCALE];
}

/**
 * Build a flat ribbon mesh (an asphalt road / zone strip) from a centerline of
 * normalized track points. Each cross-section is offset ±halfWidth along the
 * local normal; consecutive sections are joined with two triangles. Works for
 * the closed track loop and for open DRS/start segments.
 */
export function buildRibbonGeometry(pts: Vec2[], halfWidth: number, y = 0, closed = true): THREE.BufferGeometry {
  const n = pts.length;
  const left: THREE.Vector3[] = [];
  const right: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const next = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const tx = next[0] - prev[0];
    const tz = next[1] - prev[1];
    const len = Math.hypot(tx, tz) || 1;
    const nx = -tz / len; // unit normal in track space (= world dir; scale is uniform)
    const nz = tx / len;
    const cx = pts[i][0] * TRACK_SCALE;
    const cz = pts[i][1] * TRACK_SCALE;
    left.push(new THREE.Vector3(cx + nx * halfWidth, y, cz + nz * halfWidth));
    right.push(new THREE.Vector3(cx - nx * halfWidth, y, cz - nz * halfWidth));
  }

  const verts: number[] = [];
  const segCount = closed ? n : n - 1;
  for (let i = 0; i < segCount; i++) {
    const j = (i + 1) % n;
    const l0 = left[i];
    const r0 = right[i];
    const l1 = left[j];
    const r1 = right[j];
    verts.push(l0.x, l0.y, l0.z, r0.x, r0.y, r0.z, l1.x, l1.y, l1.z);
    verts.push(r0.x, r0.y, r0.z, r1.x, r1.y, r1.z, l1.x, l1.y, l1.z);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * A top-down F1 car silhouette (nose forward at +X), lying flat on the ground
 * plane and centered on the origin. Shared by every instanced car; per-car
 * yaw/position/scale come from the instance matrix.
 */
export function makeCarGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  // Outline traced clockwise from the nose tip, upper edge first, length ~2.
  s.moveTo(1.0, 0);
  s.lineTo(0.62, 0.1);
  s.lineTo(0.52, 0.1);
  s.lineTo(0.52, 0.32); // front wing
  s.lineTo(0.42, 0.32);
  s.lineTo(0.42, 0.14);
  s.lineTo(-0.1, 0.2); // cockpit / sidepod
  s.lineTo(-0.55, 0.22);
  s.lineTo(-0.72, 0.4); // rear wing
  s.lineTo(-0.9, 0.4);
  s.lineTo(-0.9, -0.4);
  s.lineTo(-0.72, -0.4);
  s.lineTo(-0.55, -0.22);
  s.lineTo(-0.1, -0.2);
  s.lineTo(0.42, -0.14);
  s.lineTo(0.42, -0.32);
  s.lineTo(0.52, -0.32);
  s.lineTo(0.52, -0.1);
  s.lineTo(0.62, -0.1);
  s.closePath();

  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2); // stand the 2D shape up flat on the xz-plane, facing +Y
  const scale = CAR_LEN / 2; // shape spans x∈[-0.9,1.0] ≈ length 2
  g.scale(scale, scale, scale);
  return g;
}
