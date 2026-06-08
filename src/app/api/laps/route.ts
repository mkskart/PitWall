import { NextRequest, NextResponse } from 'next/server';
import { getLaps } from '@/lib/openf1';

export const revalidate = 3600;

/**
 * GET /api/laps?session_key=&driver_number=
 * Full lap data including sector times. driver_number is optional.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionKey = Number(searchParams.get('session_key'));
  const driverParam = searchParams.get('driver_number');
  if (!sessionKey) return NextResponse.json({ laps: [] });

  const driverNumber = driverParam ? Number(driverParam) : undefined;
  const laps = await getLaps(sessionKey, driverNumber);
  return NextResponse.json(
    { laps },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
