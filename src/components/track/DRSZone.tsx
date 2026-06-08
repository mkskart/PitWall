'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { CircuitPath } from '@/lib/trackPaths';
import { worldPos } from './trackScale';

/**
 * Renders DRS zones as green strips laid over the track surface. Each zone is a
 * [startFrac, endFrac] range along the lap; we slice the matching span of the
 * circuit polyline and draw a thick green line just above the track.
 */
export function DRSZones({ circuit }: { circuit: CircuitPath }) {
  const segments = useMemo(() => buildZoneSegments(circuit), [circuit]);
  return (
    <group>
      {segments.map((pts, i) => (
        <DRSStrip key={i} points={pts} />
      ))}
    </group>
  );
}

function DRSStrip({ points }: { points: [number, number, number][] }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setFromPoints(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    return g;
  }, [points]);
  return (
    <line>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial color="#39B54A" transparent opacity={0.85} linewidth={2} />
    </line>
  );
}

function buildZoneSegments(circuit: CircuitPath): [number, number, number][][] {
  const pts = circuit.points;
  const n = pts.length;
  const segs: [number, number, number][][] = [];
  for (const [start, end] of circuit.drsZones) {
    const seg: [number, number, number][] = [];
    const startI = Math.floor(start * n);
    const endI = Math.floor(end * n);
    const indices: number[] = [];
    if (start <= end) {
      for (let i = startI; i <= endI; i++) indices.push(i % n);
    } else {
      for (let i = startI; i < n; i++) indices.push(i);
      for (let i = 0; i <= endI; i++) indices.push(i);
    }
    for (const i of indices) {
      const [wx, , wz] = worldPos(pts[i][0], pts[i][1]);
      seg.push([wx, 0.04, wz]);
    }
    if (seg.length > 1) segs.push(seg);
  }
  return segs;
}
