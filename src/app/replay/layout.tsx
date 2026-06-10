import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Replay' };

export default function ReplayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
