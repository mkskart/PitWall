/**
 * Typed Ergast API client. https://ergast.com/api/f1
 *
 * IMPORTANT: Ergast is being deprecated and will eventually shut down. PitWall
 * uses it ONLY as a cold fallback for data OpenF1 does not cover well —
 * primarily pre-2023 seasons, championship standings, and the race calendar.
 * Every call is wrapped so a failure degrades gracefully rather than throwing.
 */

import {
  type SessionInfo,
  type DriverStanding,
  type ConstructorStanding,
  type RaceRound,
  type RaceResultEntry,
} from './types';
import { teamColor, normalizeTeamName } from './teamColors';

const BASE = process.env.ERGAST_BASE_URL ?? 'https://ergast.com/api/f1';

async function ergast<T>(path: string, revalidate = 3600): Promise<T | null> {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, { next: { revalidate }, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── Schedule / sessions fallback ────────────────────────────────────────────

interface ErgastSchedule {
  MRData: {
    RaceTable: {
      Races: {
        round: string;
        raceName: string;
        date: string;
        time?: string;
        Circuit: {
          circuitName: string;
          Location: { locality: string; country: string };
        };
      }[];
    };
  };
}

export async function getSchedule(year: number): Promise<SessionInfo[]> {
  const data = await ergast<ErgastSchedule>(`/${year}.json`);
  const races = data?.MRData?.RaceTable?.Races ?? [];
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

interface ErgastDriverStandings {
  MRData: {
    StandingsTable: {
      StandingsLists: {
        DriverStandings: {
          position: string;
          points: string;
          wins: string;
          Driver: { driverId: string; code?: string; givenName: string; familyName: string };
          Constructors: { name: string }[];
        }[];
      }[];
    };
  };
}

export async function getDriverStandings(year: number): Promise<DriverStanding[]> {
  const data = await ergast<ErgastDriverStandings>(`/${year}/driverStandings.json`);
  const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
  // Podium counts aren't in the standings endpoint; approximate with wins and
  // enrich via results when available. Here we leave podiums at wins as a floor.
  return list.map((d) => {
    const team = d.Constructors?.[0]?.name ?? '';
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

interface ErgastConstructorStandings {
  MRData: {
    StandingsTable: {
      StandingsLists: {
        ConstructorStandings: {
          position: string;
          points: string;
          wins: string;
          Constructor: { constructorId: string; name: string };
        }[];
      }[];
    };
  };
}

export async function getConstructorStandings(year: number): Promise<ConstructorStanding[]> {
  const data = await ergast<ErgastConstructorStandings>(`/${year}/constructorStandings.json`);
  const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? [];
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

interface ErgastResults {
  MRData: {
    RaceTable: {
      Races: {
        round: string;
        raceName: string;
        date: string;
        time?: string;
        Circuit: { circuitName: string; Location: { locality: string; country: string } };
        Results?: {
          position: string;
          points: string;
          status: string;
          Driver: { code?: string; givenName: string; familyName: string };
          Constructor: { name: string };
          Time?: { time: string };
        }[];
      }[];
    };
  };
}

export async function getResults(year: number, round: number): Promise<RaceResultEntry[]> {
  const data = await ergast<ErgastResults>(`/${year}/${round}/results.json`);
  const race = data?.MRData?.RaceTable?.Races?.[0];
  const results = race?.Results ?? [];
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

/** Full-season calendar with podiums for completed rounds. */
export async function getCalendar(year: number): Promise<RaceRound[]> {
  const data = await ergast<ErgastResults>(`/${year}/results/1.json`);
  // The above returns winners per round; combine with full schedule for dates.
  const schedule = await getSchedule(year);
  const now = Date.now();

  // Fetch podiums in parallel for rounds that have already happened.
  const rounds: RaceRound[] = await Promise.all(
    schedule.map(async (s) => {
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
    }),
  );
  return rounds.sort((a, b) => a.round - b.round);
}
