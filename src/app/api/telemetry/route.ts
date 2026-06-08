import { NextRequest, NextResponse } from 'next/server';
import { getCarData, getLaps, buildTelemetryLap } from '@/lib/openf1';

export const revalidate = 3600;

/**
 * GET /api/telemetry?session_key=&driver_number=&lap_number=
 *
 * Returns speed/throttle/brake/gear/DRS samples for a single lap, with a
 * derived distance axis (meters). We first look up the lap's start time and
 * duration so we can window the car_data query tightly.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionKey = Number(searchParams.get('session_key'));
  const driverNumber = Number(searchParams.get('driver_number'));
  const lapNumber = Number(searchParams.get('lap_number'));

  if (!sessionKey || !driverNumber || !lapNumber) {
    return NextResponse.json({ telemetry: null });
  }

  const laps = await getLaps(sessionKey, driverNumber);
  const lap = laps.find((l) => l.lapNumber === lapNumber);
  let dateStart: string | undefined;
  let dateEnd: string | undefined;
  if (lap?.dateStart) {
    dateStart = lap.dateStart;
    if (lap.lapDuration) {
      dateEnd = new Date(new Date(lap.dateStart).getTime() + lap.lapDuration * 1000 + 1000).toISOString();
    }
  }

  const raw = await getCarData(sessionKey, driverNumber, dateStart, dateEnd);
  const telemetry = buildTelemetryLap(raw, driverNumber, lapNumber);
  return NextResponse.json(
    { telemetry },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
