import { buildTrack, type CircuitPath } from './_spline';

// Silverstone — high-speed flowing corners: Maggotts, Becketts, Copse.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.45, 0.95],
  [0.8, 0.75],
  [0.95, 0.4],
  [0.7, 0.25],
  [0.9, -0.05],
  [0.95, -0.45],
  [0.6, -0.55],
  [0.7, -0.85],
  [0.3, -0.95],
  [0.0, -0.7],
  [-0.2, -0.95],
  [-0.55, -0.85],
  [-0.45, -0.55],
  [-0.75, -0.45],
  [-0.95, -0.1],
  [-0.6, 0.1],
  [-0.9, 0.4],
  [-0.55, 0.6],
  [-0.7, 0.9],
  [-0.3, 0.85],
];

export const silverstone: CircuitPath = {
  id: 'silverstone',
  name: 'Silverstone Circuit',
  country: 'United Kingdom',
  points: buildTrack(anchors),
  sectors: [0.34, 0.67, 1.0],
  drsZones: [
    [0.93, 0.05],
    [0.38, 0.48],
  ],
};

export default silverstone;
