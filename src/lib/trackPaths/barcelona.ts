import { buildTrack, type CircuitPath } from './_spline';

// Circuit de Barcelona-Catalunya — long front straight, technical final sector.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.55, 0.92],
  [0.9, 0.7],
  [0.7, 0.45],
  [0.95, 0.2],
  [0.75, -0.1],
  [0.9, -0.45],
  [0.5, -0.6],
  [0.6, -0.9],
  [0.15, -0.85],
  [-0.25, -0.95],
  [-0.55, -0.7],
  [-0.35, -0.45],
  [-0.7, -0.35],
  [-0.95, -0.05],
  [-0.6, 0.2],
  [-0.85, 0.5],
  [-0.45, 0.65],
  [-0.55, 0.9],
  [-0.2, 0.85],
];

export const barcelona: CircuitPath = {
  id: 'barcelona',
  name: 'Circuit de Barcelona-Catalunya',
  country: 'Spain',
  points: buildTrack(anchors),
  sectors: [0.35, 0.68, 1.0],
  drsZones: [
    [0.94, 0.06],
    [0.4, 0.5],
  ],
};

export default barcelona;
