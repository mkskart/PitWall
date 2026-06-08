import { buildTrack, type CircuitPath } from './_spline';

// Suzuka — the calendar's only figure-eight, with the iconic 130R and esses.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.4, 0.92],
  [0.7, 0.78],
  [0.55, 0.55],
  [0.8, 0.45],
  [0.95, 0.15],
  [0.55, 0.05],
  [0.35, -0.15],
  [0.1, -0.05],
  [-0.15, 0.1],
  [-0.05, 0.35],
  [-0.4, 0.5],
  [-0.75, 0.45],
  [-0.95, 0.1],
  [-0.6, -0.05],
  [-0.8, -0.35],
  [-0.55, -0.55],
  [-0.7, -0.85],
  [-0.3, -0.9],
  [0.1, -0.7],
  [0.35, -0.95],
  [0.6, -0.6],
  [0.3, -0.4],
  [0.15, 0.6],
];

export const suzuka: CircuitPath = {
  id: 'suzuka',
  name: 'Suzuka International Racing Course',
  country: 'Japan',
  points: buildTrack(anchors),
  sectors: [0.35, 0.68, 1.0],
  drsZones: [[0.9, 0.04]],
};

export default suzuka;
