import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z
  .object({
    COPERNICUS_CLIENT_ID: z.string().optional().default(''),
    COPERNICUS_CLIENT_SECRET: z.string().optional().default(''),
    COPERNICUS_TOKEN_URL: z
      .string()
      .url()
      .default(
        'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
      ),
    COPERNICUS_BASE_URL: z.string().url().default('https://sh.dataspace.copernicus.eu'),
    PORT: z.coerce.number().int().positive().default(4000),

    PARCEL_PROVIDER: z
      .enum(['mock', 'tkgm', 'verified_geojson', 'database', 'fallback'])
      .default('mock'),
    PARCEL_PROVIDER_ORDER: z.string().default('tkgm,verified_geojson,database'),
    TKGM_BASE_URL: z.string().default('https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api'),
    TKGM_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    TKGM_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    TKGM_PROVINCES_PATH: z
      .string()
      .default(
        'https://parselsorgu.tkgm.gov.tr/app/modules/administrativeQuery/data/ilListe.json',
      ),
    TKGM_DISTRICTS_PATH: z.string().default('/idariYapi/ilceListe/{provinceId}'),
    TKGM_NEIGHBORHOODS_PATH: z.string().default('/idariYapi/mahalleListe/{districtId}'),
    TKGM_PARCEL_PATH: z.string().default('/parsel/{neighborhoodId}/{block}/{parcel}'),
    TKGM_REFERER: z.string().default('https://parselsorgu.tkgm.gov.tr/'),

    CLIMATE_PROVIDER: z
      .enum(['mock', 'nasa-power', 'fallback', 'external'])
      .default('mock'),
    SOIL_PROVIDER: z
      .enum(['mock', 'soilgrids', 'fallback', 'external'])
      .default('mock'),
    EXTERNAL_CLIMATE_BASE_URL: z.string().optional().default(''),
    EXTERNAL_SOIL_BASE_URL: z.string().optional().default(''),
    EXTERNAL_CLIMATE_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    EXTERNAL_SOIL_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

    NASA_POWER_BASE_URL: z.string().url().default('https://power.larc.nasa.gov'),
    NASA_POWER_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    NASA_POWER_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    NASA_POWER_HISTORY_YEARS: z.coerce.number().int().min(3).max(30).default(10),
    NASA_POWER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),

    SOILGRIDS_BASE_URL: z.string().url().default('https://rest.isric.org'),
    SOILGRIDS_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    SOILGRIDS_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(1),
    SOILGRIDS_CACHE_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),

    TERRAIN_PROVIDER: z
      .enum(['mock', 'copernicus-dem', 'fallback'])
      .default('mock'),
    TERRAIN_DEM_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    TERRAIN_DEM_INSTANCE: z.string().default('COPERNICUS_30'),
    TERRAIN_DEM_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),

    LAND_USABILITY_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    CROP_PHYSICAL_COMPATIBILITY_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    CALIBRATION_MANAGEMENT_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),

    DATABASE_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    PERSISTENCE_PROVIDER: z.enum(['in-memory', 'postgresql']).default('in-memory'),
    DATABASE_URL: z.string().optional().default(''),
    DATABASE_CONNECTION_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(5_000),
    DATABASE_STATEMENT_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15_000),
    DATABASE_POOL_MIN: z.coerce.number().int().min(0).default(0),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),
    DATABASE_SSL: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    DATABASE_AUTO_MIGRATE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    IDEMPOTENCY_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    IDEMPOTENCY_REQUIRED_FOR_CRITICAL_WRITES: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
    IDEMPOTENCY_REPLAY_CLIENT_ERRORS: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    IDEMPOTENCY_IN_PROGRESS_STATUS_CODE: z
      .union([z.literal(409), z.literal(425), z.literal('409'), z.literal('425')])
      .default(409)
      .transform((v) => Number(v) as 409 | 425),
    IDEMPOTENCY_CLEANUP_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    IDEMPOTENCY_CLEANUP_INTERVAL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(3_600),
    IDEMPOTENCY_CLEANUP_BATCH_SIZE: z.coerce
      .number()
      .int()
      .positive()
      .default(500),
    CORRELATION_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    METRICS_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    SLOW_REQUEST_THRESHOLD_MS: z.coerce.number().int().positive().default(2_000),

    ANALYSIS_DATA_MODE: z.enum(['live', 'golden']).default('live'),

    WEEKLY_ANALYSIS_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    WEEKLY_ANALYSIS_INTERVAL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
    WEEKLY_ANALYSIS_CHECK_MINUTES: z.coerce.number().int().min(15).max(1440).default(60),
    AMS_BASE_URL: z.string().default('http://127.0.0.1:5109'),
    AMS_INTEGRATION_API_KEY: z.string().optional().default(''),
  })
  .superRefine((value, ctx) => {
    const hasCopernicusClientId = Boolean(value.COPERNICUS_CLIENT_ID.trim());
    const hasCopernicusClientSecret = Boolean(value.COPERNICUS_CLIENT_SECRET.trim());
    if (hasCopernicusClientId !== hasCopernicusClientSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasCopernicusClientId
          ? ['COPERNICUS_CLIENT_SECRET']
          : ['COPERNICUS_CLIENT_ID'],
        message: 'Copernicus client ID and secret must be configured together',
      });
    }
    if (
      value.TERRAIN_DEM_ENABLED &&
      value.TERRAIN_PROVIDER === 'copernicus-dem' &&
      (!hasCopernicusClientId || !hasCopernicusClientSecret)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COPERNICUS_CLIENT_ID'],
        message:
          'Copernicus credentials are required when TERRAIN_PROVIDER=copernicus-dem and TERRAIN_DEM_ENABLED=true',
      });
    }
    if (value.PARCEL_PROVIDER === 'tkgm' && !value.TKGM_BASE_URL.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['TKGM_BASE_URL'],
        message: 'TKGM_BASE_URL is required when PARCEL_PROVIDER=tkgm',
      });
    }
    if (value.CLIMATE_PROVIDER === 'external' && !value.EXTERNAL_CLIMATE_BASE_URL?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['EXTERNAL_CLIMATE_BASE_URL'],
        message: 'EXTERNAL_CLIMATE_BASE_URL is required when CLIMATE_PROVIDER=external',
      });
    }
    if (value.SOIL_PROVIDER === 'external' && !value.EXTERNAL_SOIL_BASE_URL?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['EXTERNAL_SOIL_BASE_URL'],
        message: 'EXTERNAL_SOIL_BASE_URL is required when SOIL_PROVIDER=external',
      });
    }
    if (value.PERSISTENCE_PROVIDER === 'postgresql') {
      if (!value.DATABASE_ENABLED) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_ENABLED'],
          message:
            'DATABASE_ENABLED must be true when PERSISTENCE_PROVIDER=postgresql',
        });
      }
      if (!value.DATABASE_URL?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message: 'DATABASE_URL is required when PERSISTENCE_PROVIDER=postgresql',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/** Test helper to reset cached env after changing process.env. */
export function resetEnvCache(): void {
  cachedEnv = null;
}
