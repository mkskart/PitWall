import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE = process.env.OPENF1_BASE_URL ?? 'https://api.openf1.org/v1';

interface RawPosition {
  driver_number: number;
  position: number;
  date: string;
}
interface RawLocation {
  driver_number: number;
  date: string;
  x: number;
  y: number;
  z: number;
}

async function fetchJson<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * GET /api/position?session_key=&interval_ms=500
 *
 * Server-Sent Events endpoint. Every `interval_ms` it polls OpenF1 /position
 * (running order) and the most recent /location samples (raw track-space x/z),
 * merges them per driver, and pushes a `frame` event. All polling stays
 * server-side; the browser only holds an EventSource.
 *
 * If OpenF1 has no data for the session, it emits a single `empty` event so the
 * client can fall back to the simulation engine, then closes.
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

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Probe once — if there's no position data, tell the client to simulate.
      const probe = await fetchJson<RawPosition>(`${BASE}/position?session_key=${sessionKey}`);
      if (!probe.length) {
        send('empty', { reason: 'no-openf1-data' });
        controller.close();
        closed = true;
        return;
      }

      const poll = async () => {
        if (closed) return;
        const since = new Date(Date.now() - 8000).toISOString();
        const [positions, locations] = await Promise.all([
          fetchJson<RawPosition>(`${BASE}/position?session_key=${sessionKey}`),
          fetchJson<RawLocation>(`${BASE}/location?session_key=${sessionKey}&date%3E=${since}`),
        ]);

        // Latest position per driver.
        const latestPos = new Map<number, RawPosition>();
        for (const p of positions) {
          const cur = latestPos.get(p.driver_number);
          if (!cur || new Date(p.date) > new Date(cur.date)) latestPos.set(p.driver_number, p);
        }
        // Latest location per driver.
        const latestLoc = new Map<number, RawLocation>();
        for (const l of locations) {
          const cur = latestLoc.get(l.driver_number);
          if (!cur || new Date(l.date) > new Date(cur.date)) latestLoc.set(l.driver_number, l);
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
      };

      await poll();
      const timer = setInterval(poll, intervalMs);

      // Heartbeat to keep intermediaries from buffering/closing the stream.
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(': ping\n\n'));
      }, 15000);

      const cleanup = () => {
        closed = true;
        clearInterval(timer);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
