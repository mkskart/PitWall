import { buildTrack, type CircuitPath } from './_spline';

// Interlagos, Sao Paulo — short, anti-clockwise, undulating with the Senna S.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.3, 0.8],
  [0.2, 0.55],
  [0.5, 0.45],
  [0.8, 0.6],
  [0.95, 0.25],
  [0.65, 0.1],
  [0.85, -0.2],
  [0.6, -0.5],
  [0.8, -0.8],
  [0.4, -0.9],
  [0.1, -0.65],
  [-0.2, -0.9],
  [-0.55, -0.8],
  [-0.4, -0.5],
  [-0.7, -0.4],
  [-0.95, -0.1],
  [-0.6, 0.15],
  [-0.85, 0.5],
  [-0.45, 0.7],
  [-0.5, 0.95],
  [-0.2, 0.9],
];

export const brazil: CircuitPath = {
  id: 'brazil',
  name: 'Autodromo Jose Carlos Pace (Interlagos)',
  country: 'Brazil',
  points: buildTrack(anchors),
  sectors: [0.33, 0.66, 1.0],
  drsZones: [
    [0.92, 0.05],
    [0.42, 0.52],
  ],
};

export default brazil;
