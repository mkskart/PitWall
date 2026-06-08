import { NextRequest, NextResponse } from 'next/server';
import { getDrivers } from '@/lib/openf1';

export const revalidate = 3600;

/**
 * GET /api/drivers?session_key=
 * OpenF1 /drivers enriched with resolved team colors from teamColors.ts.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionKey = Number(searchParams.get('session_key'));
  if (!sessionKey) {
    return NextResponse.json({ drivers: [] }, { status: 200 });
  }
  const drivers = await getDrivers(sessionKey);
  return NextResponse.json(
    { drivers },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
