import { NextRequest, NextResponse } from 'next/server';
import { getPits } from '@/lib/openf1';

export const revalidate = 600;

/** GET /api/pit?session_key= — pit stop data. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionKey = Number(searchParams.get('session_key'));
  if (!sessionKey) return NextResponse.json({ pits: [] });
  const pits = await getPits(sessionKey);
  return NextResponse.json(
    { pits },
    { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } },
  );
}
