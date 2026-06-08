import { buildTrack, type CircuitPath } from './_spline';

// Circuit of the Americas, Austin — steep uphill T1, esses inspired by Silverstone/Suzuka.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.15, 0.7],
  [0.4, 0.78],
  [0.6, 0.6],
  [0.45, 0.4],
  [0.7, 0.3],
  [0.95, 0.4],
  [0.85, 0.05],
  [0.95, -0.3],
  [0.6, -0.45],
  [0.8, -0.7],
  [0.45, -0.85],
  [0.55, -0.6],
  [0.2, -0.7],
  [-0.2, -0.95],
  [-0.55, -0.8],
  [-0.4, -0.5],
  [-0.75, -0.4],
  [-0.95, -0.05],
  [-0.6, 0.15],
  [-0.85, 0.5],
  [-0.45, 0.65],
  [-0.55, 0.95],
  [-0.25, 0.88],
];

export const austin: CircuitPath = {
  id: 'austin',
  name: 'Circuit of the Americas',
  country: 'United States',
  points: buildTrack(anchors),
  sectors: [0.33, 0.66, 1.0],
  drsZones: [
    [0.92, 0.05],
    [0.44, 0.54],
  ],
};

export default austin;
