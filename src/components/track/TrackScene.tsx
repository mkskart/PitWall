'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useRaceStore } from '@/store/raceStore';
import type { CircuitPath } from '@/lib/trackPaths';
import { worldPos, TRACK_SCALE } from './trackScale';
import { CarDot } from './CarDot';
import { MotionTrail } from './MotionTrail';
import { DRSZones } from './DRSZone';
import { SectorMarkers } from './SectorMarker';

/**
 * The 3D track map. A perspective camera sits at ~60° looking down at a
 * normalized track ribbon. Cars are glowing spheres updated imperatively from
 * the store. The camera slowly orbits when nothing is selected and locks onto
 * the selected car otherwise.
 */
export function TrackScene() {
  const drivers = useRaceStore((s) => s.drivers);
  const circuit = useRaceStore((s) => s.circuit);

  return (
    <Canvas
      camera={{ position: [0, TRACK_SCALE * 1.1, TRACK_SCALE * 1.1], fov: 42, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => useRaceStore.getState().selectDriver(null)}
    >
      <color attach="background" args={['#080810']} />
      <fog attach="fog" args={['#080810', TRACK_SCALE * 1.5, TRACK_SCALE * 4]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={0.6} />

      <TrackRibbon circuit={circuit} />
      <GroundGrid />
      <DRSZones circuit={circuit} />
      <SectorMarkers circuit={circuit} />

      {drivers.map((d) => (
        <group key={d.driverNumber}>
          <MotionTrail driverNumber={d.driverNumber} color={d.color} />
          <CarDot driverNumber={d.driverNumber} code={d.code} color={d.color} />
        </group>
      ))}

      <CameraRig />
    </Canvas>
  );
}

/** The track centerline drawn as a glowing closed ribbon. */
function TrackRibbon({ circuit }: { circuit: CircuitPath }) {
  const { line, glow } = useMemo(() => {
    const points = circuit.points.map(([x, z]) => {
      const [wx, , wz] = worldPos(x, z);
      return new THREE.Vector3(wx, 0, wz);
    });
    points.push(points[0].clone()); // close the loop
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return { line: g, glow: g };
  }, [circuit]);

  return (
    <group>
      {/* wide soft underlay for a glow effect */}
      <line>
        <primitive object={glow} attach="geometry" />
        <lineBasicMaterial color="#2a2a3a" transparent opacity={0.5} />
      </line>
      <line>
        <primitive object={line} attach="geometry" />
        <lineBasicMaterial color="#8a8aa0" linewidth={2} />
      </line>
    </group>
  );
}

function GroundGrid() {
  return (
    <gridHelper
      args={[TRACK_SCALE * 4, 40, '#1a1a2a', '#101018']}
      position={[0, -0.02, 0]}
    />
  );
}

/**
 * Camera controller. Orbits gently around the track when no driver is selected;
 * eases toward a chase position behind the selected car when one is picked.
 */
function CameraRig() {
  const { camera } = useThree();
  const angle = useRef(0);
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));
  const desired = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const selected = useRaceStore.getState().selectedDriver;
    const cars = useRaceStore.getState().cars;

    if (selected != null && cars[selected]) {
      const car = cars[selected];
      const [wx, , wz] = worldPos(car.x, car.z);
      desired.current.set(wx + TRACK_SCALE * 0.45, TRACK_SCALE * 0.7, wz + TRACK_SCALE * 0.45);
      lookTarget.current.lerp(new THREE.Vector3(wx, 0, wz), Math.min(1, delta * 4));
    } else {
      angle.current += delta * 0.12;
      const r = TRACK_SCALE * 1.55;
      desired.current.set(Math.cos(angle.current) * r, TRACK_SCALE * 1.1, Math.sin(angle.current) * r);
      lookTarget.current.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, delta * 2));
    }

    camera.position.lerp(desired.current, Math.min(1, delta * 1.6));
    camera.lookAt(lookTarget.current);
  });

  return null;
}
