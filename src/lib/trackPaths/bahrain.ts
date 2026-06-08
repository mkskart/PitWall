import { buildTrack, type CircuitPath } from './_spline';

// Bahrain International Circuit — long back straights with a tight stadium section.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.55, 0.95],
  [0.7, 0.55],
  [0.45, 0.4],
  [0.75, 0.2],
  [0.95, -0.15],
  [0.6, -0.35],
  [0.7, -0.7],
  [0.3, -0.95],
  [-0.1, -0.7],
  [-0.35, -0.95],
  [-0.7, -0.7],
  [-0.55, -0.3],
  [-0.95, -0.1],
  [-0.7, 0.3],
  [-0.9, 0.6],
  [-0.45, 0.7],
  [-0.3, 0.95],
];

export const bahrain: CircuitPath = {
  id: 'bahrain',
  name: 'Bahrain International Circuit',
  country: 'Bahrain',
  points: buildTrack(anchors),
  sectors: [0.34, 0.66, 1.0],
  drsZones: [
    [0.95, 0.06],
    [0.2, 0.3],
    [0.55, 0.64],
  ],
};

export default bahrain;
