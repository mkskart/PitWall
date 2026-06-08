'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRaceStore } from '@/store/raceStore';
import { worldPos, CAR_RADIUS } from './trackScale';

const TRAIL_LENGTH = 8;

/**
 * A fading motion trail for a single car. Each frame it samples the car's
 * current position from the store and shifts a ring buffer of trail segments,
 * mutating mesh transforms directly (no React state) for 60fps smoothness.
 * Opacity fades from 0.8 at the head to 0 at the tail.
 */
export function MotionTrail({ driverNumber, color }: { driverNumber: number; color: string }) {
  const group = useRef<THREE.Group>(null);
  const history = useRef<[number, number][]>([]);
  const meshes = useRef<THREE.Mesh[]>([]);

  useFrame(() => {
    const car = useRaceStore.getState().cars[driverNumber];
    if (!car) return;
    const h = history.current;
    h.unshift([car.x, car.z]);
    if (h.length > TRAIL_LENGTH) h.pop();

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const mesh = meshes.current[i];
      if (!mesh) continue;
      const sample = h[i];
      if (!sample) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const [wx, , wz] = worldPos(sample[0], sample[1]);
      mesh.position.set(wx, 0.02, wz);
      const t = 1 - i / TRAIL_LENGTH;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.8 * t;
      const s = (0.85 - i * 0.07) * CAR_RADIUS * 1.4;
      mesh.scale.setScalar(Math.max(0.05, s));
    }
  });

  return (
    <group ref={group}>
      {Array.from({ length: TRAIL_LENGTH }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) meshes.current[i] = m;
          }}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
