'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { CircuitPath, Vec2 } from '@/lib/trackPaths';
import { ROAD_HALF, buildRibbonGeometry } from './trackScale';

/**
 * Renders DRS zones as translucent green ribbons laid over the asphalt. Each
 * zone is a [startFrac, endFrac] range along the lap; we slice the matching
 * span of the circuit polyline and build a ribbon just above the track surface.
 */
export function DRSZones({ circuit }: { circuit: CircuitPath }) {
  const geometries = useMemo(() => {
    return buildZoneSegments(circuit).map((pts) => buildRibbonGeometry(pts, ROAD_HALF * 0.92, 0.04, false));
  }, [circuit]);

  return (
    <group>
      {geometries.map((geom, i) => (
        <mesh key={i} geometry={geom}>
          <meshBasicMaterial
            color="#27F4D2"
            transparent
            opacity={0.16}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function buildZoneSegments(circuit: CircuitPath): Vec2[][] {
  const pts = circuit.points;
  const n = pts.length;
  const segs: Vec2[][] = [];
  for (const [start, end] of circuit.drsZones) {
    const seg: Vec2[] = [];
    const startI = Math.floor(start * n);
    const endI = Math.floor(end * n);
    const indices: number[] = [];
    if (start <= end) {
      for (let i = startI; i <= endI; i++) indices.push(i % n);
    } else {
      for (let i = startI; i < n; i++) indices.push(i);
      for (let i = 0; i <= endI; i++) indices.push(i);
    }
    for (const i of indices) seg.push(pts[i]);
    if (seg.length > 1) segs.push(seg);
  }
  return segs;
}
