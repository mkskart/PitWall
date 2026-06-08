import { buildTrack, type CircuitPath } from './_spline';

// Circuit de Monaco — tight, twisting street circuit through Monte Carlo.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.3, 0.95],
  [0.45, 0.7],
  [0.35, 0.5],
  [0.6, 0.45],
  [0.8, 0.6],
  [0.95, 0.35],
  [0.7, 0.2],
  [0.85, -0.05],
  [0.6, -0.25],
  [0.75, -0.5],
  [0.45, -0.65],
  [0.55, -0.9],
  [0.15, -0.85],
  [-0.2, -0.95],
  [-0.4, -0.6],
  [-0.15, -0.45],
  [-0.5, -0.3],
  [-0.85, -0.45],
  [-0.7, -0.05],
  [-0.95, 0.25],
  [-0.55, 0.4],
  [-0.7, 0.7],
  [-0.3, 0.75],
];

export const monaco: CircuitPath = {
  id: 'monaco',
  name: 'Circuit de Monaco',
  country: 'Monaco',
  points: buildTrack(anchors),
  sectors: [0.31, 0.63, 1.0],
  drsZones: [[0.9, 0.02]],
};

export default monaco;
