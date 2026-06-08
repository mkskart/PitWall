import type { CircuitPath } from './_spline';
import bahrain from './bahrain';
import jeddah from './jeddah';
import melbourne from './melbourne';
import imola from './imola';
import monaco from './monaco';
import barcelona from './barcelona';
import montreal from './montreal';
import silverstone from './silverstone';
import spa from './spa';
import budapest from './budapest';
import zandvoort from './zandvoort';
import monza from './monza';
import singapore from './singapore';
import suzuka from './suzuka';
import austin from './austin';
import mexico from './mexico';
import brazil from './brazil';
import lasvegas from './lasvegas';
import abudhabi from './abudhabi';

export type { CircuitPath, Vec2 } from './_spline';

export const CIRCUITS: Record<string, CircuitPath> = {
  bahrain,
  jeddah,
  melbourne,
  imola,
  monaco,
  barcelona,
  montreal,
  silverstone,
  spa,
  budapest,
  zandvoort,
  monza,
  singapore,
  suzuka,
  austin,
  mexico,
  brazil,
  lasvegas,
  abudhabi,
};

export const DEFAULT_CIRCUIT = bahrain;

/**
 * OpenF1 exposes a `circuit_short_name` / `location` / `country_name` per
 * session. Map any of those onto one of our precomputed circuit paths. Falls
 * back to Bahrain so the 3D scene always has geometry to render.
 */
const NAME_HINTS: Record<string, string> = {
  sakhir: 'bahrain',
  bahrain: 'bahrain',
  jeddah: 'jeddah',
  'saudi arabia': 'jeddah',
  melbourne: 'melbourne',
  'albert park': 'melbourne',
  australia: 'melbourne',
  imola: 'imola',
  'emilia romagna': 'imola',
  monaco: 'monaco',
  'monte carlo': 'monaco',
  catalunya: 'barcelona',
  barcelona: 'barcelona',
  spain: 'barcelona',
  montreal: 'montreal',
  villeneuve: 'montreal',
  canada: 'montreal',
  silverstone: 'silverstone',
  britain: 'silverstone',
  'great britain': 'silverstone',
  spa: 'spa',
  francorchamps: 'spa',
  belgium: 'spa',
  hungaroring: 'budapest',
  budapest: 'budapest',
  hungary: 'budapest',
  zandvoort: 'zandvoort',
  netherlands: 'zandvoort',
  dutch: 'zandvoort',
  monza: 'monza',
  italy: 'monza',
  'marina bay': 'singapore',
  singapore: 'singapore',
  suzuka: 'suzuka',
  japan: 'suzuka',
  americas: 'austin',
  austin: 'austin',
  cota: 'austin',
  rodriguez: 'mexico',
  mexico: 'mexico',
  interlagos: 'brazil',
  'sao paulo': 'brazil',
  brazil: 'brazil',
  'las vegas': 'lasvegas',
  vegas: 'lasvegas',
  'yas marina': 'abudhabi',
  'abu dhabi': 'abudhabi',
  'yas island': 'abudhabi',
};

export function resolveCircuit(...hints: (string | null | undefined)[]): CircuitPath {
  for (const hint of hints) {
    if (!hint) continue;
    const key = hint.trim().toLowerCase();
    if (CIRCUITS[key]) return CIRCUITS[key];
    for (const [needle, id] of Object.entries(NAME_HINTS)) {
      if (key.includes(needle)) return CIRCUITS[id];
    }
  }
  return DEFAULT_CIRCUIT;
}
