import { NextRequest, NextResponse } from 'next/server';
import { getSessions, getLatestSession } from '@/lib/openf1';
import { getSchedule } from '@/lib/ergast';

export const revalidate = 300;

/**
 * GET /api/sessions?year=&round=
 *
 * Returns sessions for a year from OpenF1. Falls back to the Ergast schedule
 * for seasons OpenF1 doesn't cover (pre-2023) or when OpenF1 returns nothing.
 * With no params, returns the latest session globally so the dashboard can
 * detect a live race.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get('year');
  const roundParam = searchParams.get('round');

  // No year → "what's the latest session?" probe for the live dashboard.
  if (!yearParam) {
    const latest = await getLatestSession();
    return NextResponse.json({ latest, sessions: latest ? [latest] : [] });
  }

  const year = Number(yearParam);
  let sessions = await getSessions({ year });

  // Cold fallback to Ergast for older seasons / empty OpenF1 responses.
  if (!sessions.length) {
    sessions = await getSchedule(year);
  }

  if (roundParam) {
    const round = Number(roundParam);
    sessions = sessions.filter((s) => s.round === round || s.round === null);
  }

  const latest = sessions.find((s) => s.isLive) ?? null;
  return NextResponse.json({ latest, sessions });
}
