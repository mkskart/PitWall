import { buildTrack, type CircuitPath } from './_spline';

// Autodromo Hermanos Rodriguez, Mexico City — thin air, huge straight, stadium section.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.55, 0.95],
  [0.9, 0.78],
  [0.95, 0.4],
  [0.7, 0.25],
  [0.9, 0.0],
  [0.95, -0.35],
  [0.6, -0.5],
  [0.75, -0.8],
  [0.35, -0.9],
  [0.15, -0.6],
  [0.4, -0.45],
  [0.1, -0.3],
  [-0.2, -0.45],
  [-0.15, -0.75],
  [-0.5, -0.85],
  [-0.7, -0.5],
  [-0.45, -0.3],
  [-0.85, -0.2],
  [-0.95, 0.2],
  [-0.6, 0.4],
  [-0.85, 0.7],
  [-0.4, 0.82],
];

export const mexico: CircuitPath = {
  id: 'mexico',
  name: 'Autodromo Hermanos Rodriguez',
  country: 'Mexico',
  points: buildTrack(anchors),
  sectors: [0.34, 0.67, 1.0],
  drsZones: [
    [0.93, 0.06],
    [0.4, 0.5],
  ],
};

export default mexico;
