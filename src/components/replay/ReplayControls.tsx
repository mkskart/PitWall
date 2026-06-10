'use client';

import { useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import { PlaybackBar } from './PlaybackBar';
import { PLAYBACK_SPEEDS, type ReplayController } from '@/hooks/useReplay';
import { formatElapsed, cn } from '@/lib/utils';

/**
 * Fixed bottom playback bar: transport, scrubber, speed selector, clock.
 * Keyboard shortcuts: space = play/pause, ←/→ = ±15s, [ / ] = ±1 lap.
 */
export function ReplayControls({ ctrl }: { ctrl: ReplayController }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't steal keys from form fields (the race selector dropdowns).
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          ctrl.toggle();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          ctrl.seekBy(-15);
          break;
        case 'ArrowRight':
          e.preventDefault();
          ctrl.seekBy(15);
          break;
        case '[':
          ctrl.jumpLap(-1);
          break;
        case ']':
          ctrl.jumpLap(1);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctrl]);

  return (
    <div className="panel flex items-center gap-3 px-3 h-12">
      <button
        onClick={ctrl.toggle}
        disabled={!ctrl.ready}
        className="flex items-center justify-center h-8 w-8 shrink-0 border border-border-strong hover:bg-[#ffffff0c] disabled:opacity-40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#FF8000]"
        style={{ borderRadius: 2 }}
        aria-label={ctrl.isPlaying ? 'Pause' : 'Play'}
        title="Space"
      >
        {ctrl.isPlaying ? (
          <Pause size={15} className="text-white" fill="currentColor" />
        ) : (
          <Play size={15} className="text-white" fill="currentColor" />
        )}
      </button>

      <PlaybackBar
        elapsed={ctrl.elapsed}
        duration={ctrl.duration}
        totalLaps={ctrl.totalLaps}
        onSeek={ctrl.seek}
      />

      <div className="flex items-center gap-1 shrink-0">
        {PLAYBACK_SPEEDS.map((s) => {
          const active = ctrl.speed === s;
          return (
            <button
              key={s}
              onClick={() => ctrl.setSpeed(s)}
              className={cn(
                'relative mono text-[11px] px-2 py-1 border transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#FF8000]',
                active ? 'text-black border-transparent' : 'text-muted border-border hover:text-white',
              )}
              style={{ borderRadius: 2 }}
            >
              {active && (
                <motion.span
                  layoutId="speed-pill"
                  className="absolute inset-0 bg-[#FF8000]"
                  style={{ borderRadius: 2 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                />
              )}
              <span className="relative z-10">{s}x</span>
            </button>
          );
        })}
      </div>

      <div className="shrink-0 text-right min-w-[150px] hidden sm:block">
        <div className="mono text-[13px] text-white tabular-nums">
          LAP {ctrl.lap} / {ctrl.totalLaps}
        </div>
        <div className="mono text-[10px] text-muted tabular-nums">{formatElapsed(ctrl.elapsed)} elapsed</div>
      </div>
    </div>
  );
}
