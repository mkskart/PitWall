/**
 * Environment configuration, validated at module load (server-side).
 * The app must boot with sensible defaults when .env.local is absent, so every
 * variable has a fallback; validation only rejects values that are present but
 * malformed (e.g. a non-URL base), failing loudly at startup instead of
 * producing confusing fetch errors later.
 */
import { z } from 'zod';

const envSchema = z.object({
  /**
   * OpenF1 — primary data source (live + historical, 2023+).
   */
  OPENF1_BASE_URL: z.string().url().default('https://api.openf1.org/v1'),
  /**
   * Ergast-compatible fallback. ergast.com was sunset at the end of 2024; the
   * default now points at Jolpica (https://github.com/jolpica/jolpica-f1), the
   * community successor that serves the identical API surface. The variable
   * name is kept for compatibility with existing deployments.
   */
  ERGAST_BASE_URL: z.string().url().default('https://api.jolpi.ca/ergast/f1'),
});

const parsed = envSchema.safeParse({
  OPENF1_BASE_URL: process.env.OPENF1_BASE_URL || undefined,
  ERGAST_BASE_URL: process.env.ERGAST_BASE_URL || undefined,
});

if (!parsed.success) {
  // Malformed (not missing) configuration — surface it immediately.
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;
