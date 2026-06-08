import { buildTrack, type CircuitPath } from './_spline';

// Spa-Francorchamps — the longest lap on the calendar, Eau Rouge / Raidillon.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.25, 0.8],
  [0.15, 0.55],
  [0.5, 0.5],
  [0.85, 0.65],
  [0.95, 0.3],
  [0.6, 0.15],
  [0.8, -0.1],
  [0.95, -0.45],
  [0.65, -0.6],
  [0.8, -0.85],
  [0.4, -0.9],
  [0.1, -0.6],
  [-0.15, -0.85],
  [-0.5, -0.9],
  [-0.45, -0.55],
  [-0.75, -0.45],
  [-0.95, -0.6],
  [-0.85, -0.15],
  [-0.55, 0.0],
  [-0.85, 0.35],
  [-0.5, 0.55],
  [-0.65, 0.85],
  [-0.3, 0.9],
];

export const spa: CircuitPath = {
  id: 'spa',
  name: 'Circuit de Spa-Francorchamps',
  country: 'Belgium',
  points: buildTrack(anchors),
  sectors: [0.32, 0.66, 1.0],
  drsZones: [
    [0.92, 0.06],
    [0.3, 0.4],
  ],
};

export default spa;
