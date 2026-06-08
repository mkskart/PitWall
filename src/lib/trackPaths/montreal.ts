import { buildTrack, type CircuitPath } from './_spline';

// Circuit Gilles Villeneuve, Montreal — stop-start, hard braking, "Wall of Champions".
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.6, 0.95],
  [0.95, 0.8],
  [0.85, 0.45],
  [0.95, 0.1],
  [0.7, -0.05],
  [0.85, -0.3],
  [0.6, -0.5],
  [0.8, -0.75],
  [0.4, -0.85],
  [0.5, -0.6],
  [0.15, -0.7],
  [-0.25, -0.95],
  [-0.6, -0.85],
  [-0.45, -0.55],
  [-0.8, -0.5],
  [-0.95, -0.1],
  [-0.6, 0.1],
  [-0.85, 0.45],
  [-0.5, 0.6],
  [-0.65, 0.9],
  [-0.25, 0.85],
];

export const montreal: CircuitPath = {
  id: 'montreal',
  name: 'Circuit Gilles Villeneuve',
  country: 'Canada',
  points: buildTrack(anchors),
  sectors: [0.33, 0.66, 1.0],
  drsZones: [
    [0.9, 0.04],
    [0.45, 0.56],
  ],
};

export default montreal;
