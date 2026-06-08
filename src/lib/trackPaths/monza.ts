import { buildTrack, type CircuitPath } from './_spline';

// Autodromo Nazionale Monza — the "Temple of Speed", long straights and chicanes.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.3, 0.92],
  [0.25, 0.7],
  [0.45, 0.62],
  [0.55, 0.4],
  [0.85, 0.45],
  [0.95, 0.1],
  [0.6, -0.05],
  [0.75, -0.35],
  [0.5, -0.6],
  [0.65, -0.9],
  [0.2, -0.95],
  [-0.2, -0.85],
  [-0.45, -0.95],
  [-0.7, -0.6],
  [-0.45, -0.35],
  [-0.8, -0.2],
  [-0.95, 0.2],
  [-0.6, 0.4],
  [-0.8, 0.7],
  [-0.4, 0.8],
];

export const monza: CircuitPath = {
  id: 'monza',
  name: 'Autodromo Nazionale Monza',
  country: 'Italy',
  points: buildTrack(anchors),
  sectors: [0.34, 0.68, 1.0],
  drsZones: [
    [0.94, 0.05],
    [0.36, 0.46],
  ],
};

export default monza;
