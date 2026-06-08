/** Shared mapping from normalized [-1,1] track space into the R3F world. */
export const TRACK_SCALE = 12;
export const CAR_RADIUS = TRACK_SCALE * 0.015;

/** Normalized (x, z) → world [x, y, z] on the ground plane. */
export function worldPos(x: number, z: number): [number, number, number] {
  return [x * TRACK_SCALE, 0, z * TRACK_SCALE];
}
