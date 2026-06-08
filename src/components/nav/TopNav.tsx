'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LivePill } from './LivePill';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/replay', label: 'Replay' },
  { href: '/standings', label: 'Standings' },
  { href: '/compare', label: 'Compare' },
];

const CURRENT_YEAR = new Date().getFullYear();

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

/** Persistent top navigation. Wordmark left, links center, session pill right. */
export function TopNav() {
  const pathname = usePathname();

  // Route the bare nav links to sensible default targets.
  const resolved = LINKS.map((l) => {
    if (l.href === '/replay') return { ...l, to: `/replay/${CURRENT_YEAR}/1` };
    if (l.href === '/standings') return { ...l, to: `/standings/${CURRENT_YEAR}` };
    return { ...l, to: l.href };
  });

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-12 border-b border-border-strong bg-[#080810f0] backdrop-blur-sm">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-1.5 select-none">
          <span className="mono font-bold tracking-tight text-[15px] text-[#FF8000]">PIT</span>
          <span className="mono font-bold tracking-tight text-[15px] text-white">WALL</span>
        </Link>

        <nav className="flex items-center gap-1">
          {resolved.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.to}
                className="relative px-3 py-1.5 text-[13px] font-sans transition-colors"
                style={{ color: active ? '#ffffff' : '#8a8a99' }}
              >
                {l.label}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute left-2 right-2 -bottom-[7px] h-[2px] bg-[#FF8000]"
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center">
          <LivePill />
        </div>
      </div>
    </header>
  );
}
