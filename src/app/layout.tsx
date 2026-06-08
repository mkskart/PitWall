import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { TopNav } from '@/components/nav/TopNav';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: 'PitWall — F1 Telemetry & Analytics',
  description:
    'Live F1 timing, 3D track maps, interpolated race replay, and head-to-head driver telemetry. Built on OpenF1 with an Ergast fallback.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <TopNav />
          <main className="pt-12">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
