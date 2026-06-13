'use client';

import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useRaceStore } from '@/store/raceStore';
import type { CircuitPath } from '@/lib/trackPaths';
import { TRACK_SCALE, ROAD_HALF, buildRibbonGeometry } from './trackScale';
import { InstancedCars } from './InstancedCars';
import { DRSZones } from './DRSZone';
import { SectorMarkers } from './SectorMarker';

/**
 * The 3D track map. A perspective camera looks down at a tilted angle on an
 * asphalt ribbon; cars render as instanced top-down silhouettes updated
 * imperatively from the store. The view is user-controlled (drag to orbit,
 * scroll to zoom) with no auto-rotation, and the render loop pauses while the
 * tab is hidden.
 */
export function TrackScene() {
  const drivers = useRaceStore((s) => s.drivers);
  const circuit = useRaceStore((s) => s.circuit);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, TRACK_SCALE * 1.6, TRACK_SCALE * 0.85], fov: 40, near: 0.1, far: 400 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      frameloop={visible ? 'always' : 'never'}
      onPointerMissed={() => useRaceStore.getState().selectDriver(null)}
    >
      <color attach="background" args={['#080810']} />
      <fog attach="fog" args={['#080810', TRACK_SCALE * 2.4, TRACK_SCALE * 6]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 24, 8]} intensity={0.7} />

      <GroundGrid />
      <TrackRibbon circuit={circuit} />
      <DRSZones circuit={circuit} />
      <SectorMarkers circuit={circuit} />

      <InstancedCars drivers={drivers} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        minDistance={TRACK_SCALE * 0.7}
        maxDistance={TRACK_SCALE * 3.2}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI * 0.46}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}

/**
 * The track surface: a dark asphalt ribbon with a subtle racing line down the
 * center and a white start/finish bar at the lap origin.
 */
function TrackRibbon({ circuit }: { circuit: CircuitPath }) {
  const asphalt = useMemo(() => buildRibbonGeometry(circuit.points, ROAD_HALF, 0, true), [circuit]);
  const racingLine = useMemo(() => buildRibbonGeometry(circuit.points, ROAD_HALF * 0.07, 0.015, true), [circuit]);
  const startFinish = useMemo(() => {
    const p0 = circuit.points[0];
    const p1 = circuit.points[1] ?? circuit.points[0];
    return buildRibbonGeometry([p0, p1], ROAD_HALF, 0.03, false);
  }, [circuit]);

  return (
    <group>
      <mesh geometry={asphalt}>
        <meshBasicMaterial color="#191922" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={racingLine}>
        <meshBasicMaterial color="#3a3a52" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={startFinish}>
        <meshBasicMaterial color="#e7e7ee" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function GroundGrid() {
  return <gridHelper args={[TRACK_SCALE * 5, 50, '#15151f', '#0d0d15']} position={[0, -0.05, 0]} />;
}
