import { buildTrack, type CircuitPath } from './_spline';

// Marina Bay Street Circuit, Singapore — bumpy, walled, run under floodlights.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.35, 0.95],
  [0.5, 0.72],
  [0.4, 0.55],
  [0.65, 0.5],
  [0.85, 0.65],
  [0.95, 0.35],
  [0.65, 0.2],
  [0.85, -0.05],
  [0.6, -0.25],
  [0.8, -0.5],
  [0.45, -0.6],
  [0.6, -0.88],
  [0.2, -0.9],
  [-0.15, -0.95],
  [-0.35, -0.65],
  [-0.1, -0.45],
  [-0.45, -0.35],
  [-0.8, -0.5],
  [-0.7, -0.1],
  [-0.95, 0.2],
  [-0.55, 0.35],
  [-0.75, 0.65],
  [-0.3, 0.78],
];

export const singapore: CircuitPath = {
  id: 'singapore',
  name: 'Marina Bay Street Circuit',
  country: 'Singapore',
  points: buildTrack(anchors),
  sectors: [0.32, 0.65, 1.0],
  drsZones: [
    [0.91, 0.03],
    [0.4, 0.5],
    [0.7, 0.78],
  ],
};

export default singapore;
