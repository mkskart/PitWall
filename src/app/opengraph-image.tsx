import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PitWall — F1 telemetry & analytics';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Social card rendered at request time with next/og — no binary assets in the repo. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: '#080810',
          color: '#e7e7ee',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ display: 'flex', fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>
          <span style={{ color: '#FF8000' }}>PIT</span>
          <span style={{ color: '#ffffff' }}>WALL</span>
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#8a8a99', marginTop: 18 }}>
          F1 telemetry · live timing · 3D track map · race replay
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 48 }}>
          {['#3671C6', '#E8002D', '#FF8000', '#27F4D2', '#229971', '#FF87BC', '#64C4FF', '#6692FF', '#52E252', '#B6BABD'].map(
            (c) => (
              <div key={c} style={{ width: 64, height: 8, background: c }} />
            ),
          )}
        </div>
      </div>
    ),
    size,
  );
}
