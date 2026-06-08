import { buildTrack, type CircuitPath } from './_spline';

// Hungaroring, Budapest — tight, twisty, "Monaco without the walls".
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.4, 0.9],
  [0.7, 0.95],
  [0.85, 0.6],
  [0.6, 0.45],
  [0.9, 0.25],
  [0.7, -0.05],
  [0.9, -0.35],
  [0.55, -0.5],
  [0.7, -0.8],
  [0.3, -0.9],
  [0.05, -0.6],
  [-0.2, -0.9],
  [-0.55, -0.8],
  [-0.4, -0.5],
  [-0.7, -0.4],
  [-0.95, -0.1],
  [-0.6, 0.15],
  [-0.85, 0.45],
  [-0.5, 0.6],
  [-0.6, 0.9],
  [-0.25, 0.85],
];

export const budapest: CircuitPath = {
  id: 'budapest',
  name: 'Hungaroring',
  country: 'Hungary',
  points: buildTrack(anchors),
  sectors: [0.33, 0.66, 1.0],
  drsZones: [
    [0.92, 0.05],
    [0.46, 0.55],
  ],
};

export default budapest;
