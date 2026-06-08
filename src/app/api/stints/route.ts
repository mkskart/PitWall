import { NextRequest, NextResponse } from 'next/server';
import { getStints } from '@/lib/openf1';

export const revalidate = 600;

/** GET /api/stints?session_key= — tire compound + age per stint. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionKey = Number(searchParams.get('session_key'));
  if (!sessionKey) return NextResponse.json({ stints: [] });
  const stints = await getStints(sessionKey);
  return NextResponse.json(
    { stints },
    { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } },
  );
}
