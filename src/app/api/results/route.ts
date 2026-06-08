import { NextRequest, NextResponse } from 'next/server';
import { getResults, getCalendar } from '@/lib/ergast';

export const revalidate = 3600;

/**
 * GET /api/results?year=&round=
 * Race results for a specific round, or the full-season calendar with podiums
 * when no round is given.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get('year')) || new Date().getFullYear();
  const roundParam = searchParams.get('round');

  if (roundParam) {
    const results = await getResults(year, Number(roundParam));
    return NextResponse.json(
      { year, round: Number(roundParam), results },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    );
  }

  const calendar = await getCalendar(year);
  return NextResponse.json(
    { year, calendar },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
