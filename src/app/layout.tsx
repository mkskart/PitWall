import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import { Providers } from './providers';
import { TopNav } from '@/components/nav/TopNav';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'PitWall — F1 Telemetry & Analytics',
    template: '%s — PitWall',
  },
  description:
    'Live F1 timing, 3D track maps, interpolated race replay, and head-to-head driver telemetry. Built on OpenF1 with an Ergast-compatible fallback.',
  openGraph: {
    title: 'PitWall — F1 Telemetry & Analytics',
    description: 'Live timing, 3D track map, race replay, and head-to-head telemetry comparison.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          <TopNav />
          <main className="pt-12">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
