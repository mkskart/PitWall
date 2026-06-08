'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useRaceStore } from '@/store/raceStore';
import { worldPos, CAR_RADIUS } from './trackScale';

/**
 * A single car: a glowing team-colored sphere. Its position is mutated directly
 * each frame from the store (never via React state), and it smoothly lerps
 * toward the latest sample to hide network/tick jitter. The selected car pulses
 * and shows a code label.
 */
export function CarDot({
  driverNumber,
  code,
  color,
}: {
  driverNumber: number;
  code: string;
  color: string;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const target = useRef(new THREE.Vector3());
  const selectDriver = useRaceStore((s) => s.selectDriver);

  useFrame((_, delta) => {
    const car = useRaceStore.getState().cars[driverNumber];
    if (!car || !mesh.current) return;
    const [wx, , wz] = worldPos(car.x, car.z);
    target.current.set(wx, CAR_RADIUS, wz);
    // Critically-damped-ish smoothing toward the target sample.
    const a = Math.min(1, delta * 12);
    mesh.current.position.lerp(target.current, a);
    if (glow.current) {
      glow.current.position.copy(mesh.current.position);
      const selected = useRaceStore.getState().selectedDriver === driverNumber;
      const pulse = selected ? 1.6 + Math.sin(performance.now() / 200) * 0.25 : 1.3;
      glow.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {/* soft additive glow halo */}
      <mesh ref={glow}>
        <sphereGeometry args={[CAR_RADIUS, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* the car body */}
      <mesh
        ref={mesh}
        onClick={(e) => {
          e.stopPropagation();
          selectDriver(driverNumber);
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'default')}
      >
        <sphereGeometry args={[CAR_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
        <SelectedLabel driverNumber={driverNumber} code={code} color={color} />
      </mesh>
    </group>
  );
}

function SelectedLabel({ driverNumber, code, color }: { driverNumber: number; code: string; color: string }) {
  const selected = useRaceStore((s) => s.selectedDriver === driverNumber);
  if (!selected) return null;
  return (
    <Html center distanceFactor={14} position={[0, CAR_RADIUS * 6, 0]} zIndexRange={[10, 0]}>
      <div
        className="mono text-[10px] px-1.5 py-0.5 whitespace-nowrap"
        style={{ background: '#080810cc', color, border: `1px solid ${color}`, borderRadius: 2 }}
      >
        {code}
      </div>
    </Html>
  );
}
