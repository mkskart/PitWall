/**
 * Ergast-compatible API client — served by Jolpica (https://api.jolpi.ca).
 *
 * IMPORTANT: the original ergast.com API was sunset at the end of 2024. The
 * default base URL now points at Jolpica, the community-maintained successor
 * that exposes the identical MRData interface, so this client works unchanged
 * against either host (override via ERGAST_BASE_URL).
 *
 * PitWall uses this source ONLY as a cold fallback for data OpenF1 does not
 * cover — pre-2023 seasons, championship standings, and the race calendar.
 * Every call is validated with Zod and degrades to an empty result on failure.
 */

import {
  type SessionInfo,
  type DriverStanding,
  type ConstructorStanding,
  type RaceRound,
  type RaceResultEntry,
} from './types';
import { teamColor, normalizeTeamName } from './teamColors';
import { env } from './env';
import { fetchJsonSafe, mapLimit } from './fetcher';
import {
  parseOne,
  ergastScheduleSchema,
  ergastDriverStandingsSchema,
  ergastConstructorStandingsSchema,
  ergastResultsSchema,
} from './schemas';

async function ergast<T>(schema: Parameters<typeof parseOne>[0], path: string, revalidate = 3600): Promise<T | null> {
  const data = await fetchJsonSafe<unknown>(`${env.ERGAST_BASE_URL}${path}`, { revalidate });
  return parseOne(schema, data, `ergast${path}`) as T | null;
}

// ─── Schedule / sessions fallback ────────────────────────────────────────────

export async function getSchedule(year: number): Promise<SessionInfo[]> {
  type Sched = typeof ergastScheduleSchema._output;
  const data = await ergast<Sched>(ergastScheduleSchema, `/${year}.json`);
  const races = data?.MRData.RaceTable.Races ?? [];
  return races.map((r) => ({
    sessionKey: null,
    meetingKey: null,
    year,
    round: Number(r.round),
    name: r.raceName,
    type: 'Race',
    circuitShortName: r.Circuit.circuitName,
    circuitKey: '',
    country: r.Circuit.Location.country,
    location: r.Circuit.Location.locality,
    dateStart: `${r.date}T${r.time ?? '13:00:00Z'}`,
    dateEnd: `${r.date}T${r.time ?? '15:00:00Z'}`,
    isLive: false,
    source: 'ergast' as const,
  }));
}

// ─── Driver standings ────────────────────────────────────────────────────────

export async function getDriverStandings(year: number): Promise<DriverStanding[]> {
  type DS = typeof ergastDriverStandingsSchema._output;
  const data = await ergast<DS>(ergastDriverStandingsSchema, `/${year}/driverStandings.json`);
  const list = data?.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
  // Podium counts aren't exposed by the standings endpoint; wins are used as a
  // floor (the standings table labels the column accordingly).
  return list.map((d) => {
    const team = d.Constructors[0]?.name ?? '';
    return {
      position: Number(d.position),
      points: Number(d.points),
      wins: Number(d.wins),
      podiums: Number(d.wins),
      driverId: d.Driver.driverId,
      code: d.Driver.code ?? d.Driver.familyName.slice(0, 3).toUpperCase(),
      givenName: d.Driver.givenName,
      familyName: d.Driver.familyName,
      team,
      teamName: normalizeTeamName(team),
      color: teamColor(team),
    };
  });
}

// ─── Constructor standings ───────────────────────────────────────────────────

export async function getConstructorStandings(year: number): Promise<ConstructorStanding[]> {
  type CS = typeof ergastConstructorStandingsSchema._output;
  const data = await ergast<CS>(ergastConstructorStandingsSchema, `/${year}/constructorStandings.json`);
  const list = data?.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];
  return list.map((c) => ({
    position: Number(c.position),
    points: Number(c.points),
    wins: Number(c.wins),
    constructorId: c.Constructor.constructorId,
    name: c.Constructor.name,
    teamName: normalizeTeamName(c.Constructor.name),
    color: teamColor(c.Constructor.name),
  }));
}

// ─── Results ─────────────────────────────────────────────────────────────────

export async function getResults(year: number, round: number): Promise<RaceResultEntry[]> {
  type Res = typeof ergastResultsSchema._output;
  const data = await ergast<Res>(ergastResultsSchema, `/${year}/${round}/results.json`);
  const results = data?.MRData.RaceTable.Races[0]?.Results ?? [];
  return results.map((r) => {
    const team = r.Constructor.name;
    return {
      position: Number(r.position),
      driverCode: r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase(),
      driverName: `${r.Driver.givenName} ${r.Driver.familyName}`,
      team,
      color: teamColor(team),
      time: r.Time?.time ?? null,
      status: r.status,
      points: Number(r.points),
    };
  });
}

/**
 * Full-season calendar with podiums for completed rounds. Podium lookups run
 * with bounded concurrency (4 at a time) so a 24-round season doesn't burst
 * past Jolpica's rate limits.
 */
export async function getCalendar(year: number): Promise<RaceRound[]> {
  const schedule = await getSchedule(year);
  const now = Date.now();

  const rounds = await mapLimit(schedule, 4, async (s): Promise<RaceRound> => {
    const round = s.round ?? 0;
    const start = new Date(s.dateStart).getTime();
    const completed = Number.isFinite(start) && start < now;
    let podium: RaceRound['podium'] = [];
    if (completed) {
      const results = await getResults(year, round);
      podium = results.slice(0, 3).map((r) => ({ code: r.driverCode, name: r.driverName, color: r.color }));
    }
    return {
      round,
      raceName: s.name,
      circuitName: s.circuitShortName,
      locality: s.location,
      country: s.country,
      date: s.dateStart,
      time: null,
      podium,
      completed,
    };
  });
  return rounds.sort((a, b) => a.round - b.round);
}
