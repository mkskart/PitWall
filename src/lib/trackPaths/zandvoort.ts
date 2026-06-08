import { buildTrack, type CircuitPath } from './_spline';

// Circuit Zandvoort — banked corners through the dunes.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.5, 0.92],
  [0.85, 0.7],
  [0.7, 0.45],
  [0.95, 0.3],
  [0.8, -0.05],
  [0.95, -0.4],
  [0.55, -0.55],
  [0.7, -0.85],
  [0.25, -0.9],
  [-0.1, -0.7],
  [-0.3, -0.95],
  [-0.6, -0.75],
  [-0.45, -0.45],
  [-0.8, -0.35],
  [-0.95, 0.0],
  [-0.6, 0.2],
  [-0.85, 0.55],
  [-0.45, 0.7],
  [-0.55, 0.95],
  [-0.2, 0.88],
];

export const zandvoort: CircuitPath = {
  id: 'zandvoort',
  name: 'Circuit Zandvoort',
  country: 'Netherlands',
  points: buildTrack(anchors),
  sectors: [0.34, 0.67, 1.0],
  drsZones: [
    [0.93, 0.05],
    [0.42, 0.5],
  ],
};

export default zandvoort;
