/**
 * Canonical team color map for the current F1 grid.
 * Every driver/team element in the UI is accented ONLY with these colors —
 * there are no generic blue/purple accents anywhere in the app.
 */

export type TeamName =
  | 'Red Bull Racing'
  | 'Ferrari'
  | 'Mercedes'
  | 'McLaren'
  | 'Aston Martin'
  | 'Alpine'
  | 'Williams'
  | 'RB'
  | 'Kick Sauber'
  | 'Haas F1 Team';

export const TEAM_COLORS: Record<TeamName, string> = {
  'Red Bull Racing': '#3671C6',
  Ferrari: '#E8002D',
  Mercedes: '#27F4D2',
  McLaren: '#FF8000',
  'Aston Martin': '#229971',
  Alpine: '#FF87BC',
  Williams: '#64C4FF',
  RB: '#6692FF',
  'Kick Sauber': '#52E252',
  'Haas F1 Team': '#B6BABD',
};

/**
 * OpenF1 and Ergast return team names with inconsistent spellings / casing.
 * This lookup normalizes any reasonable variant onto a canonical TeamName.
 */
const TEAM_ALIASES: Record<string, TeamName> = {
  'red bull': 'Red Bull Racing',
  'red bull racing': 'Red Bull Racing',
  redbull: 'Red Bull Racing',
  'oracle red bull racing': 'Red Bull Racing',
  ferrari: 'Ferrari',
  'scuderia ferrari': 'Ferrari',
  mercedes: 'Mercedes',
  'mercedes amg': 'Mercedes',
  'mercedes-amg petronas': 'Mercedes',
  mclaren: 'McLaren',
  'mclaren mercedes': 'McLaren',
  'aston martin': 'Aston Martin',
  'aston martin aramco': 'Aston Martin',
  alpine: 'Alpine',
  'alpine f1 team': 'Alpine',
  williams: 'Williams',
  rb: 'RB',
  'rb f1 team': 'RB',
  'visa cash app rb': 'RB',
  vcarb: 'RB',
  alphatauri: 'RB',
  'kick sauber': 'Kick Sauber',
  'stake f1 team kick sauber': 'Kick Sauber',
  sauber: 'Kick Sauber',
  'alfa romeo': 'Kick Sauber',
  haas: 'Haas F1 Team',
  'haas f1 team': 'Haas F1 Team',
  'moneygram haas f1 team': 'Haas F1 Team',
};

const FALLBACK_COLOR = '#B6BABD';

export function normalizeTeamName(raw: string | null | undefined): TeamName | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (TEAM_ALIASES[key]) return TEAM_ALIASES[key];
  // Partial match — handle sponsor-prefixed names gracefully.
  for (const alias of Object.keys(TEAM_ALIASES)) {
    if (key.includes(alias)) return TEAM_ALIASES[alias];
  }
  return null;
}

/**
 * Resolve a team color from any raw team string. OpenF1 also exposes a
 * per-driver `team_colour` hex (without the leading #); callers can pass that
 * as a hint and it will be used when the team name can't be normalized.
 */
export function teamColor(rawTeam: string | null | undefined, hint?: string | null): string {
  const normalized = normalizeTeamName(rawTeam);
  if (normalized) return TEAM_COLORS[normalized];
  if (hint) {
    const hex = hint.startsWith('#') ? hint : `#${hint}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  }
  return FALLBACK_COLOR;
}

/** Convert a hex color to an rgba() string at the given alpha. Used for glows. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Standard team-color glow used for selected rows, car dots, accents. */
export function teamGlow(hex: string, alpha = 0.35): string {
  return `0 0 16px ${withAlpha(hex, alpha)}`;
}
