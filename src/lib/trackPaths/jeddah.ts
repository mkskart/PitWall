import { buildTrack, type CircuitPath } from './_spline';

// Jeddah Corniche — long, fast, flowing street circuit with many sweeping kinks.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.4, 0.92],
  [0.55, 0.6],
  [0.85, 0.5],
  [0.95, 0.15],
  [0.6, 0.0],
  [0.8, -0.25],
  [0.95, -0.6],
  [0.55, -0.7],
  [0.25, -0.55],
  [0.1, -0.85],
  [-0.25, -0.95],
  [-0.5, -0.65],
  [-0.35, -0.4],
  [-0.7, -0.35],
  [-0.95, -0.55],
  [-0.85, -0.05],
  [-0.55, 0.1],
  [-0.8, 0.4],
  [-0.55, 0.7],
  [-0.25, 0.6],
];

export const jeddah: CircuitPath = {
  id: 'jeddah',
  name: 'Jeddah Corniche Circuit',
  country: 'Saudi Arabia',
  points: buildTrack(anchors),
  sectors: [0.33, 0.67, 1.0],
  drsZones: [
    [0.95, 0.08],
    [0.42, 0.5],
    [0.78, 0.88],
  ],
};

export default jeddah;
