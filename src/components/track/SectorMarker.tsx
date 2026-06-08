'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { CircuitPath } from '@/lib/trackPaths';
import { worldPos, TRACK_SCALE } from './trackScale';

const SECTOR_COLORS = ['#ffffff', '#FFD600', '#9B59D0']; // S1 white, S2 yellow, S3 purple

/**
 * Thin perpendicular lines marking the three sector boundaries. The marker is
 * drawn across the track by taking the local tangent at the boundary point and
 * extending a short segment along its normal.
 */
export function SectorMarkers({ circuit }: { circuit: CircuitPath }) {
  const markers = useMemo(() => {
    const pts = circuit.points;
    const n = pts.length;
    return circuit.sectors.map((frac, idx) => {
      const i = Math.floor(((frac % 1) + 1) % 1 * n) % n;
      const j = (i + 1) % n;
      const p = pts[i];
      const q = pts[j];
      const dx = q[0] - p[0];
      const dz = q[1] - p[1];
      const len = Math.hypot(dx, dz) || 1;
      // Normal in track space.
      const nx = -dz / len;
      const nz = dx / len;
      const half = 0.06;
      const a = worldPos(p[0] + nx * half, p[1] + nz * half);
      const b = worldPos(p[0] - nx * half, p[1] - nz * half);
      return { color: SECTOR_COLORS[idx] ?? '#ffffff', a, b };
    });
  }, [circuit]);

  return (
    <group>
      {markers.map((m, i) => (
        <SectorLine key={i} a={m.a} b={m.b} color={m.color} />
      ))}
    </group>
  );
}

function SectorLine({
  a,
  b,
  color,
}: {
  a: [number, number, number];
  b: [number, number, number];
  color: string;
}) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setFromPoints([new THREE.Vector3(a[0], 0.05, a[2]), new THREE.Vector3(b[0], 0.05, b[2])]);
    return g;
  }, [a, b]);
  return (
    <line>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial color={color} transparent opacity={0.9} />
    </line>
  );
}

export { TRACK_SCALE };
