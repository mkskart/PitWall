import { buildTrack, type CircuitPath } from './_spline';

// Autodromo Enzo e Dino Ferrari, Imola — old-school, anti-clockwise, no run-off.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.35, 0.85],
  [0.3, 0.5],
  [0.6, 0.4],
  [0.85, 0.55],
  [0.95, 0.15],
  [0.6, 0.0],
  [0.8, -0.3],
  [0.55, -0.6],
  [0.2, -0.5],
  [0.05, -0.85],
  [-0.3, -0.95],
  [-0.45, -0.6],
  [-0.2, -0.4],
  [-0.55, -0.25],
  [-0.9, -0.4],
  [-0.8, 0.05],
  [-0.5, 0.2],
  [-0.75, 0.5],
  [-0.4, 0.7],
];

export const imola: CircuitPath = {
  id: 'imola',
  name: 'Autodromo Enzo e Dino Ferrari',
  country: 'Italy',
  points: buildTrack(anchors),
  sectors: [0.3, 0.62, 1.0],
  drsZones: [
    [0.92, 0.04],
    [0.46, 0.56],
  ],
};

export default imola;
