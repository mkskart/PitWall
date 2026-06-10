import { NextRequest } from 'next/server';
import { getPositions, getLocations, type RawPosition, type RawLocation } from '@/lib/openf1';

// Streaming requires the Node.js runtime; Edge would buffer/limit the stream,
// and force-dynamic keeps Next from trying to cache an SSE response.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/position?session_key=&interval_ms=500
 *
 * Server-Sent Events endpoint. The first poll takes a full snapshot of
 * /position; every subsequent poll fetches only rows newer than the last seen
 * timestamp (`date>` filter) — late in a race the full position table is tens
 * of thousands of rows, so delta polling is the difference between ~1KB and
 * megabytes per tick. Location samples are windowed the same way and merged
 * per driver into each pushed frame.
 *
 * If OpenF1 has no data for the session, a single `empty` event is emitted so
 * the client can fall back to the simulation engine, then the stream closes.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionKey = Number(searchParams.get('session_key'));
  const intervalMs = Math.max(250, Number(searchParams.get('interval_ms')) || 500);

  if (!sessionKey) {
    return new Response('missing session_key', { status: 400 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Initial snapshot — also the probe for "does this session have data?".
      const snapshot = await getPositions(sessionKey);
      if (!snapshot.length) {
        send('empty', { reason: 'no-openf1-data' });
        cleanup();
        return;
      }

      // Rolling per-driver state, updated from deltas.
      const latestPos = new Map<number, RawPosition>();
      const latestLoc = new Map<number, RawLocation>();
      let lastPosDate = '';
      const mergePositions = (rows: RawPosition[]) => {
        for (const p of rows) {
          const cur = latestPos.get(p.driver_number);
          if (!cur || p.date >= cur.date) latestPos.set(p.driver_number, p);
          if (p.date > lastPosDate) lastPosDate = p.date;
        }
      };
      const mergeLocations = (rows: RawLocation[]) => {
        for (const l of rows) {
          const cur = latestLoc.get(l.driver_number);
          if (!cur || l.date >= cur.date) latestLoc.set(l.driver_number, l);
        }
      };

      mergePositions(snapshot);

      let polling = false;
      const poll = async (first = false) => {
        if (closed || polling) return; // skip if the previous poll is still in flight
        polling = true;
        try {
          if (!first) {
            const since = lastPosDate || new Date(Date.now() - 10_000).toISOString();
            const [positions, locations] = await Promise.all([
              getPositions(sessionKey, since),
              getLocations(sessionKey, new Date(Date.now() - 8_000).toISOString()),
            ]);
            mergePositions(positions);
            mergeLocations(locations);
          } else {
            mergeLocations(await getLocations(sessionKey, new Date(Date.now() - 8_000).toISOString()));
          }

          const order = [...latestPos.values()]
            .map((p) => {
              const loc = latestLoc.get(p.driver_number);
              return {
                driverNumber: p.driver_number,
                position: p.position,
                date: p.date,
                x: loc?.x ?? null,
                z: loc?.y ?? null, // OpenF1 location y maps to our ground-plane z
              };
            })
            .sort((a, b) => a.position - b.position);

          send('frame', { date: new Date().toISOString(), order });
        } finally {
          polling = false;
        }
      };

      await poll(true);
      timer = setInterval(() => void poll(), intervalMs);

      // Heartbeat as a real SSE event (comments are invisible to EventSource):
      // keeps intermediaries from buffering/closing the stream AND lets the
      // client watchdog detect a silent stall.
      heartbeat = setInterval(() => {
        send('hb', { t: Date.now() });
      }, 15_000);

      req.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
