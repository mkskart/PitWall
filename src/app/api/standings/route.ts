import { NextRequest, NextResponse } from 'next/server';
import { getDriverStandings, getConstructorStandings } from '@/lib/ergast';

export const revalidate = 3600;

/**
 * GET /api/standings?year=
 * Driver + constructor championship standings from Ergast (fallback-only data
 * source — documented as deprecated; see lib/ergast.ts).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get('year')) || new Date().getFullYear();
  const [drivers, constructors] = await Promise.all([
    getDriverStandings(year),
    getConstructorStandings(year),
  ]);
  return NextResponse.json(
    { year, drivers, constructors },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
