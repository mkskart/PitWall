'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useRaceStore } from '@/store/raceStore';
import type { CircuitPath } from '@/lib/trackPaths';
import { worldPos, TRACK_SCALE } from './trackScale';
import { InstancedCars } from './InstancedCars';
import { DRSZones } from './DRSZone';
import { SectorMarkers } from './SectorMarker';

/**
 * The 3D track map. A perspective camera sits at ~60° looking down at a
 * normalized track ribbon; cars render as three instanced draw calls (bodies,
 * glows, trails) updated imperatively from the store. The camera slowly orbits
 * when nothing is selected and locks onto the selected car otherwise. On
 * touch devices a drag-to-orbit fallback replaces the auto-orbit. The render
 * loop pauses entirely while the tab is hidden.
 */
export function TrackScene() {
  const drivers = useRaceStore((s) => s.drivers);
  const circuit = useRaceStore((s) => s.circuit);
  const [visible, setVisible] = useState(true);
  const isTouch = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    [],
  );

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, TRACK_SCALE * 1.1, TRACK_SCALE * 1.1], fov: 42, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      frameloop={visible ? 'always' : 'never'}
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

      <InstancedCars drivers={drivers} />

      <CameraRig touchMode={isTouch} />
    </Canvas>
  );
}

/** The track centerline drawn as a glowing closed ribbon. */
function TrackRibbon({ circuit }: { circuit: CircuitPath }) {
  const geometry = useMemo(() => {
    const points = circuit.points.map(([x, z]) => {
      const [wx, , wz] = worldPos(x, z);
      return new THREE.Vector3(wx, 0, wz);
    });
    points.push(points[0].clone()); // close the loop
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [circuit]);

  return (
    <group>
      <line>
        <primitive object={geometry} attach="geometry" />
        <lineBasicMaterial color="#8a8aa0" />
      </line>
    </group>
  );
}

function GroundGrid() {
  return <gridHelper args={[TRACK_SCALE * 4, 40, '#1a1a2a', '#101018']} position={[0, -0.02, 0]} />;
}

/**
 * Camera controller. Desktop: orbits gently when no driver is selected, eases
 * toward a chase position when one is picked. Touch: one-finger horizontal
 * drag orbits manually (auto-orbit off so the view doesn't fight the user).
 */
function CameraRig({ touchMode }: { touchMode: boolean }) {
  const { camera, gl } = useThree();
  const angle = useRef(0);
  const manualAngle = useRef<number | null>(null);
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));
  const desired = useRef(new THREE.Vector3());

  // Touch fallback: horizontal drag rotates the orbit angle directly.
  useEffect(() => {
    if (!touchMode) return;
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;
    const down = (e: TouchEvent) => {
      dragging = true;
      lastX = e.touches[0]?.clientX ?? 0;
    };
    const move = (e: TouchEvent) => {
      if (!dragging) return;
      const x = e.touches[0]?.clientX ?? 0;
      const dx = x - lastX;
      lastX = x;
      manualAngle.current = (manualAngle.current ?? angle.current) - dx * 0.008;
    };
    const up = () => (dragging = false);
    el.addEventListener('touchstart', down, { passive: true });
    el.addEventListener('touchmove', move, { passive: true });
    el.addEventListener('touchend', up);
    return () => {
      el.removeEventListener('touchstart', down);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', up);
    };
  }, [touchMode, gl]);

  useFrame((_, delta) => {
    const selected = useRaceStore.getState().selectedDriver;
    const cars = useRaceStore.getState().cars;

    if (selected != null && cars[selected]) {
      const car = cars[selected];
      const [wx, , wz] = worldPos(car.x, car.z);
      desired.current.set(wx + TRACK_SCALE * 0.45, TRACK_SCALE * 0.7, wz + TRACK_SCALE * 0.45);
      lookTarget.current.lerp(new THREE.Vector3(wx, 0, wz), Math.min(1, delta * 4));
    } else {
      if (touchMode && manualAngle.current != null) {
        angle.current = manualAngle.current;
      } else if (!touchMode) {
        angle.current += delta * 0.12;
      }
      const r = TRACK_SCALE * 1.55;
      desired.current.set(Math.cos(angle.current) * r, TRACK_SCALE * 1.1, Math.sin(angle.current) * r);
      lookTarget.current.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, delta * 2));
    }

    camera.position.lerp(desired.current, Math.min(1, delta * 1.6));
    camera.lookAt(lookTarget.current);
  });

  return null;
}
