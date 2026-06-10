'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useRaceStore } from '@/store/raceStore';
import type { Driver } from '@/lib/types';
import { worldPos, CAR_RADIUS } from './trackScale';

const TRAIL_LENGTH = 8;
/** Min movement (normalized track units) before a new trail sample is taken. */
const TRAIL_MIN_STEP = 0.012;

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

/**
 * All 20 cars + glows + motion trails in exactly THREE draw calls via
 * instanced meshes (bodies, glow halos, trail segments). Positions are
 * mutated directly in the render loop from the store — never via React state —
 * and each car eases toward its latest sample to hide network/tick jitter.
 *
 * Trail fade uses a color trick: with additive blending, scaling the instance
 * color toward black is visually equivalent to per-instance opacity (which
 * InstancedMesh doesn't support).
 */
export function InstancedCars({ drivers }: { drivers: Driver[] }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const glows = useRef<THREE.InstancedMesh>(null);
  const trails = useRef<THREE.InstancedMesh>(null);
  const selectDriver = useRaceStore((s) => s.selectDriver);

  const n = drivers.length;

  // Per-car smoothed position + trail ring buffer (plain refs, no React state).
  const smoothed = useRef<Map<number, THREE.Vector3>>(new Map());
  const trailHistory = useRef<Map<number, [number, number][]>>(new Map());

  const colors = useMemo(() => drivers.map((d) => new THREE.Color(d.color)), [drivers]);

  // Seed static per-instance colors whenever the grid changes.
  useEffect(() => {
    if (!bodies.current || !glows.current || !n) return;
    for (let i = 0; i < n; i++) {
      bodies.current.setColorAt(i, colors[i]);
      glows.current.setColorAt(i, colors[i]);
    }
    if (bodies.current.instanceColor) bodies.current.instanceColor.needsUpdate = true;
    if (glows.current.instanceColor) glows.current.instanceColor.needsUpdate = true;
  }, [colors, n]);

  useFrame((state, delta) => {
    const store = useRaceStore.getState();
    const cars = store.cars;
    const selected = store.selectedDriver;
    const b = bodies.current;
    const g = glows.current;
    const tr = trails.current;
    if (!b || !g || !tr) return;

    const ease = Math.min(1, delta * 12);
    const pulse = 1.6 + Math.sin(state.clock.elapsedTime * 5) * 0.25;

    for (let i = 0; i < n; i++) {
      const num = drivers[i].driverNumber;
      const car = cars[num];

      let pos = smoothed.current.get(num);
      if (!pos) {
        pos = new THREE.Vector3(0, CAR_RADIUS, 0);
        smoothed.current.set(num, pos);
      }
      if (car) {
        const [wx, , wz] = worldPos(car.x, car.z);
        pos.x += (wx - pos.x) * ease;
        pos.y = CAR_RADIUS;
        pos.z += (wz - pos.z) * ease;
      }

      // body
      tmpObj.position.copy(pos);
      tmpObj.scale.setScalar(car ? 1 : 0);
      tmpObj.updateMatrix();
      b.setMatrixAt(i, tmpObj.matrix);

      // glow halo (pulses when selected)
      tmpObj.scale.setScalar(car ? (selected === num ? pulse : 1.3) : 0);
      tmpObj.updateMatrix();
      g.setMatrixAt(i, tmpObj.matrix);

      // trail ring buffer — sample only after real movement so the trail spans
      // meaningful distance instead of the last 8 animation frames.
      let hist = trailHistory.current.get(num);
      if (!hist) {
        hist = [];
        trailHistory.current.set(num, hist);
      }
      if (car) {
        const last = hist[0];
        if (!last || Math.hypot(car.x - last[0], car.z - last[1]) > TRAIL_MIN_STEP) {
          hist.unshift([car.x, car.z]);
          if (hist.length > TRAIL_LENGTH) hist.pop();
        }
      }
      for (let s = 0; s < TRAIL_LENGTH; s++) {
        const idx = i * TRAIL_LENGTH + s;
        const sample = hist[s];
        if (!sample) {
          tmpObj.scale.setScalar(0);
        } else {
          const [wx, , wz] = worldPos(sample[0], sample[1]);
          tmpObj.position.set(wx, 0.02, wz);
          tmpObj.scale.setScalar(Math.max(0.05, (0.85 - s * 0.07) * CAR_RADIUS * 1.4));
        }
        tmpObj.updateMatrix();
        tr.setMatrixAt(idx, tmpObj.matrix);
        // fade via color: additive blending makes darker == fainter
        const fade = sample ? 0.8 * (1 - s / TRAIL_LENGTH) : 0;
        tmpColor.copy(colors[i]).multiplyScalar(fade);
        tr.setColorAt(idx, tmpColor);
      }
    }

    b.instanceMatrix.needsUpdate = true;
    g.instanceMatrix.needsUpdate = true;
    tr.instanceMatrix.needsUpdate = true;
    if (tr.instanceColor) tr.instanceColor.needsUpdate = true;
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId == null) return;
    const num = drivers[e.instanceId]?.driverNumber;
    if (num != null) {
      const cur = useRaceStore.getState().selectedDriver;
      selectDriver(cur === num ? null : num);
    }
  };

  if (!n) return null;

  return (
    <group>
      {/* glow halos — soft additive */}
      <instancedMesh ref={glows} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[CAR_RADIUS, 12, 12]} />
        <meshBasicMaterial transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </instancedMesh>
      {/* car bodies — clickable */}
      <instancedMesh
        ref={bodies}
        args={[undefined, undefined, n]}
        frustumCulled={false}
        onClick={onClick}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'default')}
      >
        <sphereGeometry args={[CAR_RADIUS, 16, 16]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {/* fading trails */}
      <instancedMesh ref={trails} args={[undefined, undefined, n * TRAIL_LENGTH]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </instancedMesh>
      <SelectedLabel drivers={drivers} smoothed={smoothed} />
    </group>
  );
}

/** Floating code label that tracks the selected car's smoothed position. */
function SelectedLabel({
  drivers,
  smoothed,
}: {
  drivers: Driver[];
  smoothed: React.MutableRefObject<Map<number, THREE.Vector3>>;
}) {
  const selected = useRaceStore((s) => s.selectedDriver);
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (selected == null || !group.current) return;
    const pos = smoothed.current.get(selected);
    if (pos) group.current.position.set(pos.x, pos.y + CAR_RADIUS * 6, pos.z);
  });

  if (selected == null) return null;
  const driver = drivers.find((d) => d.driverNumber === selected);
  if (!driver) return null;

  return (
    <group ref={group}>
      <Html center distanceFactor={14} zIndexRange={[10, 0]}>
        <div
          className="mono text-[10px] px-1.5 py-0.5 whitespace-nowrap"
          style={{ background: '#080810cc', color: driver.color, border: `1px solid ${driver.color}`, borderRadius: 2 }}
        >
          {driver.code}
        </div>
      </Html>
    </group>
  );
}
