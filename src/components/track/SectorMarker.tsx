'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { CircuitPath } from '@/lib/trackPaths';
import { ROAD_HALF, buildRibbonGeometry, TRACK_SCALE } from './trackScale';

const SECTOR_COLORS = ['#6b6b8a', '#FFD600', '#9B59D0']; // S1 neutral, S2 yellow, S3 purple

/**
 * Thin bars across the asphalt marking the three sector boundaries. Each is a
 * one-segment ribbon spanning the full road width at the boundary point.
 */
export function SectorMarkers({ circuit }: { circuit: CircuitPath }) {
  const markers = useMemo(() => {
    const pts = circuit.points;
    const n = pts.length;
    return circuit.sectors.map((frac, idx) => {
      const i = Math.floor(((((frac % 1) + 1) % 1) * n)) % n;
      const j = (i + 1) % n;
      return {
        color: SECTOR_COLORS[idx] ?? '#6b6b8a',
        geom: buildRibbonGeometry([pts[i], pts[j]], ROAD_HALF, 0.035, false),
      };
    });
  }, [circuit]);

  return (
    <group>
      {markers.map((m, i) => (
        <mesh key={i} geometry={m.geom}>
          <meshBasicMaterial color={m.color} transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export { TRACK_SCALE };
