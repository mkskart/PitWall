/**
 * Zod schemas for every external API response, parsed at the boundary.
 *
 * Policy: upstream rows that fail validation are dropped row-by-row rather
 * than failing the whole payload — one malformed record from OpenF1 must not
 * blank a 20-car timing screen. In development each dropped row is logged
 * loudly so shape drift is caught early; in production the filter is silent.
 */
import { z } from 'zod';

const isDev = process.env.NODE_ENV !== 'production';

/** Parse an array payload, dropping (and in dev, reporting) invalid rows. */
export function parseRows<S extends z.ZodTypeAny>(schema: S, data: unknown, label: string): z.infer<S>[] {
  if (!Array.isArray(data)) {
    if (isDev && data != null) console.error(`[schemas] ${label}: expected array, got ${typeof data}`);
    return [];
  }
  const out: z.infer<S>[] = [];
  for (const row of data) {
    const r = schema.safeParse(row);
    if (r.success) out.push(r.data);
    else if (isDev) console.error(`[schemas] ${label}: dropped invalid row —`, r.error.issues[0]?.message, row);
  }
  return out;
}

/** Parse a single object payload; returns null on failure (logged in dev). */
export function parseOne<S extends z.ZodTypeAny>(schema: S, data: unknown, label: string): z.infer<S> | null {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  if (isDev) console.error(`[schemas] ${label}: invalid payload —`, r.error.issues[0]?.message);
  return null;
}

// ─── OpenF1 ──────────────────────────────────────────────────────────────────
// Numbers are occasionally null mid-session (laps in progress, missing speed
// traps); schemas are deliberately permissive where the API is.

export const openF1SessionSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  session_name: z.string(),
  session_type: z.string(),
  date_start: z.string(),
  date_end: z.string(),
  year: z.number(),
  circuit_short_name: z.string().nullish().transform((v) => v ?? ''),
  circuit_key: z.number().nullish().transform((v) => v ?? 0),
  country_name: z.string().nullish().transform((v) => v ?? ''),
  location: z.string().nullish().transform((v) => v ?? ''),
  gmt_offset: z.string().nullish().transform((v) => v ?? ''),
});

export const openF1DriverSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  broadcast_name: z.string().nullish().transform((v) => v ?? ''),
  full_name: z.string().nullish().transform((v) => v ?? ''),
  name_acronym: z.string().nullish().transform((v) => v ?? '???'),
  team_name: z.string().nullish().transform((v) => v ?? ''),
  team_colour: z.string().nullish().transform((v) => v ?? ''),
  first_name: z.string().nullish().transform((v) => v ?? ''),
  last_name: z.string().nullish().transform((v) => v ?? ''),
  headshot_url: z.string().nullish().transform((v) => v ?? ''),
  country_code: z.string().nullish().transform((v) => v ?? ''),
});

export const openF1PositionSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  date: z.string(),
  position: z.number(),
});

export const openF1LocationSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  date: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const openF1LapSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  lap_number: z.number(),
  date_start: z.string().nullable().catch(null),
  lap_duration: z.number().nullable().catch(null),
  duration_sector_1: z.number().nullable().catch(null),
  duration_sector_2: z.number().nullable().catch(null),
  duration_sector_3: z.number().nullable().catch(null),
  st_speed: z.number().nullable().catch(null),
  is_pit_out_lap: z.boolean().catch(false),
});

export const openF1CarDataSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  date: z.string(),
  speed: z.number().catch(0),
  throttle: z.number().catch(0),
  brake: z.number().catch(0),
  n_gear: z.number().catch(0),
  rpm: z.number().catch(0),
  drs: z.number().catch(0),
});

export const openF1PitSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  date: z.string(),
  pit_duration: z.number().nullable().catch(null),
  lap_number: z.number(),
});

export const openF1StintSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  stint_number: z.number(),
  lap_start: z.number(),
  lap_end: z.number().nullable().transform((v) => v ?? 0),
  compound: z.string().nullish().transform((v) => v ?? ''),
  tyre_age_at_start: z.number().nullable().transform((v) => v ?? 0),
});

// ─── Ergast / Jolpica (MRData envelopes) ─────────────────────────────────────

const ergastDriverSchema = z.object({
  driverId: z.string(),
  code: z.string().optional(),
  givenName: z.string(),
  familyName: z.string(),
});

const ergastConstructorRefSchema = z.object({
  constructorId: z.string().optional(),
  name: z.string(),
});

export const ergastScheduleSchema = z.object({
  MRData: z.object({
    RaceTable: z.object({
      Races: z.array(
        z.object({
          round: z.string(),
          raceName: z.string(),
          date: z.string(),
          time: z.string().optional(),
          Circuit: z.object({
            circuitName: z.string(),
            Location: z.object({ locality: z.string(), country: z.string() }),
          }),
        }),
      ),
    }),
  }),
});

export const ergastDriverStandingsSchema = z.object({
  MRData: z.object({
    StandingsTable: z.object({
      StandingsLists: z.array(
        z.object({
          DriverStandings: z.array(
            z.object({
              position: z.string(),
              points: z.string(),
              wins: z.string(),
              Driver: ergastDriverSchema,
              Constructors: z.array(ergastConstructorRefSchema),
            }),
          ),
        }),
      ),
    }),
  }),
});

export const ergastConstructorStandingsSchema = z.object({
  MRData: z.object({
    StandingsTable: z.object({
      StandingsLists: z.array(
        z.object({
          ConstructorStandings: z.array(
            z.object({
              position: z.string(),
              points: z.string(),
              wins: z.string(),
              Constructor: z.object({ constructorId: z.string(), name: z.string() }),
            }),
          ),
        }),
      ),
    }),
  }),
});

export const ergastResultsSchema = z.object({
  MRData: z.object({
    RaceTable: z.object({
      Races: z.array(
        z.object({
          round: z.string(),
          raceName: z.string(),
          date: z.string(),
          Results: z
            .array(
              z.object({
                position: z.string(),
                points: z.string(),
                status: z.string(),
                Driver: ergastDriverSchema,
                Constructor: ergastConstructorRefSchema,
                Time: z.object({ time: z.string() }).optional(),
              }),
            )
            .optional(),
        }),
      ),
    }),
  }),
});
