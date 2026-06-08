import { buildTrack, type CircuitPath } from './_spline';

// Las Vegas Strip Circuit — long, fast straights down the Strip, low-grip night race.
const anchors: [number, number][] = [
  [0.0, 1.0],
  [0.6, 0.95],
  [0.95, 0.82],
  [0.95, 0.45],
  [0.7, 0.3],
  [0.95, 0.05],
  [0.85, -0.35],
  [0.5, -0.45],
  [0.65, -0.75],
  [0.25, -0.85],
  [-0.2, -0.95],
  [-0.6, -0.85],
  [-0.9, -0.6],
  [-0.95, -0.2],
  [-0.6, -0.05],
  [-0.9, 0.25],
  [-0.95, 0.6],
  [-0.55, 0.7],
  [-0.65, 0.95],
  [-0.25, 0.9],
];

export const lasvegas: CircuitPath = {
  id: 'lasvegas',
  name: 'Las Vegas Strip Circuit',
  country: 'United States',
  points: buildTrack(anchors),
  sectors: [0.35, 0.69, 1.0],
  drsZones: [
    [0.94, 0.07],
    [0.38, 0.48],
  ],
};

export default lasvegas;
