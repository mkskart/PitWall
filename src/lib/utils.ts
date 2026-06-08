import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Compound } from './types';

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a lap or sector time in seconds as M:SS.mmm (or SS.mmm under a minute).
 * Returns an em-dash for null/invalid input so the UI never shows "NaN".
 */
export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  if (mins === 0) return secs.toFixed(3);
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

/** Format a sector time as SS.mmm. */
export function formatSector(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—';
  return seconds.toFixed(3);
}

/** Format a signed delta in seconds, e.g. "+0.214" / "-0.087". */
export function formatDelta(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const sign = seconds > 0 ? '+' : seconds < 0 ? '' : '±';
  return `${sign}${seconds.toFixed(3)}`;
}

/** Format a gap to the leader, e.g. "+12.4s" or "+1 LAP". */
export function formatGap(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  if (seconds === 0) return 'LEADER';
  return `+${seconds.toFixed(1)}`;
}

/**
 * Choose a tailwind/text color for a delta value:
 *  - faster (negative) → green
 *  - slower (positive) → yellow
 *  - personal best baked in by callers using the purple chip directly
 */
export function deltaColor(delta: number | null | undefined): string {
  if (delta == null || !Number.isFinite(delta)) return 'text-muted';
  if (delta < 0) return 'text-[#27F4D2]';
  if (delta > 0) return 'text-[#FFD600]';
  return 'text-white';
}

/** Hex variant of deltaColor for inline styles / SVG. */
export function deltaHex(delta: number | null | undefined): string {
  if (delta == null || !Number.isFinite(delta)) return '#6b6b7b';
  if (delta < 0) return '#27F4D2';
  if (delta > 0) return '#FFD600';
  return '#ffffff';
}

/** Normalize any raw compound string from OpenF1/Ergast into our Compound enum. */
export function normalizeCompound(raw: string | null | undefined): Compound {
  if (!raw) return 'UNKNOWN';
  const c = raw.trim().toUpperCase();
  if (c.startsWith('SOFT') || c === 'S') return 'SOFT';
  if (c.startsWith('MED') || c === 'M') return 'MEDIUM';
  if (c.startsWith('HARD') || c === 'H') return 'HARD';
  if (c.startsWith('INT') || c === 'I') return 'INTERMEDIATE';
  if (c.startsWith('WET') || c === 'W') return 'WET';
  return 'UNKNOWN';
}

/** Clamp a number into [min, max]. */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Map a value from one range to another. */
export function mapRange(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMin;
  return outMin + ((v - inMin) * (outMax - outMin)) / (inMax - inMin);
}

/**
 * Binary search for the index of the last element whose accessor value is <= target.
 * Returns -1 if target precedes the first element. Used by the replay engine.
 */
export function binarySearchLE<T>(arr: T[], target: number, accessor: (item: T) => number): number {
  let lo = 0;
  let hi = arr.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (accessor(arr[mid]) <= target) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

/** Convert an ISO date string to epoch ms; returns NaN for invalid input. */
export function toEpoch(date: string | null | undefined): number {
  if (!date) return NaN;
  return new Date(date).getTime();
}

/** Format elapsed seconds as H:MM:SS.s for the replay clock. */
export function formatElapsed(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00:00.0';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
}

/** Country → flag emoji. Best-effort lookup keyed by common F1 country names. */
const FLAG_EMOJI: Record<string, string> = {
  Bahrain: '🇧🇭',
  'Saudi Arabia': '🇸🇦',
  Australia: '🇦🇺',
  Japan: '🇯🇵',
  China: '🇨🇳',
  USA: '🇺🇸',
  'United States': '🇺🇸',
  Italy: '🇮🇹',
  Monaco: '🇲🇨',
  Canada: '🇨🇦',
  Spain: '🇪🇸',
  Austria: '🇦🇹',
  UK: '🇬🇧',
  'United Kingdom': '🇬🇧',
  Great_Britain: '🇬🇧',
  Hungary: '🇭🇺',
  Belgium: '🇧🇪',
  Netherlands: '🇳🇱',
  Azerbaijan: '🇦🇿',
  Singapore: '🇸🇬',
  Mexico: '🇲🇽',
  Brazil: '🇧🇷',
  Qatar: '🇶🇦',
  UAE: '🇦🇪',
  'United Arab Emirates': '🇦🇪',
  France: '🇫🇷',
  Germany: '🇩🇪',
  Portugal: '🇵🇹',
  Turkey: '🇹🇷',
  Russia: '🇷🇺',
};

export function flagEmoji(country: string | null | undefined): string {
  if (!country) return '🏁';
  return FLAG_EMOJI[country] ?? FLAG_EMOJI[country.replace(/\s+/g, '_')] ?? '🏁';
}

/** Stable countdown breakdown for the race calendar. */
export function countdown(target: Date, now: Date = new Date()) {
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return { days, hours, minutes, isPast: diff === 0 };
}
