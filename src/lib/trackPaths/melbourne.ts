import { buildTrack, type CircuitPath } from './_spline';

// Albert Park, Melbourne — parkland circuit around a lake, fast flowing esses.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.5, 0.9],
  [0.85, 0.65],
  [0.95, 0.25],
  [0.7, 0.05],
  [0.9, -0.25],
  [0.7, -0.6],
  [0.3, -0.7],
  [0.4, -0.95],
  [-0.05, -0.9],
  [-0.4, -0.95],
  [-0.6, -0.6],
  [-0.4, -0.35],
  [-0.8, -0.3],
  [-0.95, 0.1],
  [-0.6, 0.3],
  [-0.85, 0.65],
  [-0.45, 0.8],
];

export const melbourne: CircuitPath = {
  id: 'melbourne',
  name: 'Albert Park Circuit',
  country: 'Australia',
  points: buildTrack(anchors),
  sectors: [0.32, 0.64, 1.0],
  drsZones: [
    [0.95, 0.05],
    [0.18, 0.28],
    [0.5, 0.6],
  ],
};

export default melbourne;
