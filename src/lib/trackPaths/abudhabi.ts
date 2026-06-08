import { buildTrack, type CircuitPath } from './_spline';

// Yas Marina Circuit, Abu Dhabi — twilight season finale around the marina.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.5, 0.92],
  [0.85, 0.72],
  [0.7, 0.5],
  [0.95, 0.35],
  [0.95, -0.05],
  [0.6, -0.2],
  [0.8, -0.45],
  [0.55, -0.65],
  [0.7, -0.9],
  [0.3, -0.92],
  [0.05, -0.6],
  [-0.2, -0.85],
  [-0.55, -0.7],
  [-0.4, -0.45],
  [-0.75, -0.35],
  [-0.95, 0.0],
  [-0.6, 0.2],
  [-0.85, 0.5],
  [-0.45, 0.68],
  [-0.55, 0.95],
  [-0.2, 0.88],
];

export const abudhabi: CircuitPath = {
  id: 'abudhabi',
  name: 'Yas Marina Circuit',
  country: 'United Arab Emirates',
  points: buildTrack(anchors),
  sectors: [0.34, 0.67, 1.0],
  drsZones: [
    [0.92, 0.05],
    [0.36, 0.46],
    [0.6, 0.68],
  ],
};

export default abudhabi;
