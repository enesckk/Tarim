import { Router, type Request, type Response } from 'express';
import { getEnv } from '../../../config/env.js';
import {
  currentPersistenceMeta,
  resolvePersistenceProvider,
} from '../../database/persistence-factory.js';
import { verifyGoldenDataset } from '../golden/golden-verify.js';
import { loadVerifiedParcelDocument } from '../../parcel/services/verified-parcel-geometry.service.js';
import { VerifiedParcelRepository } from '../../parcel/repositories/verified-parcel.repository.js';
import { fontsAvailable } from '../reporting/analysis-pdf-report.js';

type ProviderStatus = 'mock' | 'configured' | 'not_configured';

function providerStatus(
  value: string | undefined,
  realValues: string[],
): ProviderStatus {
  if (!value || value === 'mock') return 'mock';
  if (realValues.includes(value)) return 'configured';
  return 'not_configured';
}

export function createDemoReadinessRouter(): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    const env = getEnv();
    const mode = env.ANALYSIS_DATA_MODE;
    const warnings: string[] = [];

    let persistenceProvider: 'postgresql' | 'in-memory' = 'in-memory';
    let durable = false;
    try {
      persistenceProvider = resolvePersistenceProvider();
      durable = currentPersistenceMeta().durable === true;
    } catch {
      persistenceProvider = 'in-memory';
      durable = false;
      warnings.push('Persistence configuration invalid; treating as in-memory');
    }

    let databaseStatus = 'healthy';
    try {
      if (persistenceProvider === 'postgresql') {
        const { getPool } = await import('../../database/database-client.js');
        const pool = getPool();
        if (pool) {
          await pool.query('SELECT 1');
          databaseStatus = 'healthy';
        } else {
          databaseStatus = 'not_configured';
          warnings.push('PostgreSQL pool not initialized');
        }
      } else {
        databaseStatus = 'in_memory';
        warnings.push('Analysis persistence is in-memory (not durable across restarts)');
      }
    } catch {
      databaseStatus = 'unavailable';
      warnings.push('Database connection failed');
    }

    const providers: Record<string, { status: ProviderStatus }> = {
      parcel: {
        status: providerStatus(env.PARCEL_PROVIDER, [
          'tkgm',
          'verified_geojson',
          'database',
          'fallback',
        ]),
      },
      sentinelAuth: {
        status:
          env.COPERNICUS_CLIENT_ID?.trim() && env.COPERNICUS_CLIENT_SECRET?.trim()
            ? 'configured'
            : 'not_configured',
      },
      sentinelCatalog: {
        status: env.COPERNICUS_CLIENT_ID?.trim() ? 'configured' : 'not_configured',
      },
      sentinelProcess: {
        status: env.COPERNICUS_CLIENT_ID?.trim() ? 'configured' : 'not_configured',
      },
      nasaPower: {
        status: providerStatus(env.CLIMATE_PROVIDER, [
          'nasa-power',
          'fallback',
          'external',
        ]),
      },
      soilGrids: {
        status: providerStatus(env.SOIL_PROVIDER, [
          'soilgrids',
          'fallback',
          'external',
        ]),
      },
      copernicusDem: {
        status:
          (env.TERRAIN_PROVIDER === 'copernicus-dem' || env.TERRAIN_PROVIDER === 'fallback') &&
          env.TERRAIN_DEM_ENABLED
            ? 'configured'
            : env.TERRAIN_PROVIDER === 'mock'
              ? 'mock'
              : 'not_configured',
      },
    };

    const demoParcel = {
      province: 'Gaziantep',
      district: 'Şehitkamil',
      neighborhood: 'Güngürge',
      block: '108',
      parcel: '7',
    };
    let verifiedGeojsonStatus: 'ready' | 'missing' | 'invalid' = 'missing';
    try {
      await loadVerifiedParcelDocument(demoParcel);
      verifiedGeojsonStatus = 'ready';
    } catch (error) {
      verifiedGeojsonStatus =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'VERIFIED_PARCEL_MISSING'
          ? 'missing'
          : 'invalid';
    }

    let databaseParcelStatus: 'ready' | 'missing' | 'unavailable' = 'missing';
    if (persistenceProvider === 'postgresql' && databaseStatus === 'healthy') {
      try {
        const repo = new VerifiedParcelRepository();
        const record = await repo.findVerified(demoParcel);
        databaseParcelStatus = record ? 'ready' : 'missing';
      } catch {
        databaseParcelStatus = 'unavailable';
      }
    }

    const parcelProviderOrder = env.PARCEL_PROVIDER_ORDER.split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const fallbackAvailable =
      verifiedGeojsonStatus === 'ready' || databaseParcelStatus === 'ready';
    const activeParcelProvider =
      env.PARCEL_PROVIDER === 'fallback'
        ? verifiedGeojsonStatus === 'ready'
          ? 'verified_geojson'
          : databaseParcelStatus === 'ready'
            ? 'database'
            : parcelProviderOrder[0] ?? 'tkgm'
        : env.PARCEL_PROVIDER;

    const parcelSources = {
      // With fallback mode we do not require live TKGM; mark optional instead of hardcoding "forbidden".
      tkgm:
        env.PARCEL_PROVIDER === 'tkgm'
          ? 'configured'
          : env.PARCEL_PROVIDER === 'fallback'
            ? 'optional'
            : 'not_selected',
      verifiedGeojson: verifiedGeojsonStatus,
      database: databaseParcelStatus,
    } as const;

    let goldenDataset: {
      datasetType: string;
      demoReady: boolean;
      status: string;
      parcel: string;
      verifiedAt: string | null;
      level: string | null;
      errors?: string[];
    } = {
      datasetType: 'not_available',
      demoReady: false,
      status: 'not_available',
      parcel: 'Güngürge 108/7',
      verifiedAt: null,
      level: null,
    };

    if (mode === 'golden') {
      try {
        const verification = await verifyGoldenDataset();
        const isPlaceholder =
          verification.manifest.datasetType === 'placeholder' ||
          verification.manifest.demoReady === false;

        goldenDataset = {
          datasetType: verification.manifest.datasetType,
          demoReady: verification.demoReady,
          status: verification.demoReady
            ? 'ready'
            : verification.level === 'INVALID'
              ? 'invalid'
              : isPlaceholder
                ? 'placeholder'
                : 'not_demo_ready',
          parcel: 'Güngürge 108/7',
          verifiedAt: new Date().toISOString(),
          level: verification.level,
          ...(verification.errors.length > 0 ? { errors: verification.errors } : {}),
        };

        if (verification.level === 'INVALID') {
          warnings.push('Golden dataset verification failed (checksum/image/structure)');
        } else if (!verification.demoReady) {
          warnings.push('Golden dataset is not DEMO_READY');
        }
      } catch {
        goldenDataset = {
          datasetType: 'not_found',
          demoReady: false,
          status: 'not_found',
          parcel: 'Güngürge 108/7',
          verifiedAt: null,
          level: 'INVALID',
        };
        warnings.push('Golden dataset not found');
      }
    }

    const mockProviders = Object.entries(providers)
      .filter(([, v]) => v.status === 'mock')
      .map(([k]) => k);
    const missingCritical = Object.entries(providers)
      .filter(([, v]) => v.status === 'not_configured')
      .map(([k]) => k);

    if (mode === 'live') {
      if (mockProviders.length > 0) {
        warnings.push(`Mock providers in use: ${mockProviders.join(', ')}`);
      }
      if (missingCritical.length > 0) {
        warnings.push(`Providers not configured: ${missingCritical.join(', ')}`);
      }
    }

    let status: 'ready' | 'degraded' | 'not_ready' = 'not_ready';
    let demoReady = false;

    if (mode === 'golden') {
      demoReady = goldenDataset.demoReady === true;
      // Placeholder, checksum/image problems, or incomplete capture => not_ready
      status = demoReady ? 'ready' : 'not_ready';
    } else {
      const sentinelOk = providers.sentinelAuth.status === 'configured';
      const dbFailed =
        persistenceProvider === 'postgresql' &&
        (databaseStatus === 'unavailable' || databaseStatus === 'not_configured');

      if (mockProviders.length > 0 || !sentinelOk || dbFailed) {
        status = 'not_ready';
        demoReady = false;
      } else if (persistenceProvider === 'postgresql' && databaseStatus === 'healthy') {
        status = 'ready';
        demoReady = true;
      } else if (persistenceProvider === 'in-memory') {
        // Live providers are configured; in-memory is fine for local/demo runs.
        status = 'ready';
        demoReady = true;
      } else {
        status = 'ready';
        demoReady = true;
      }
    }

    res.json({
      status,
      demoReady,
      mode,
      persistence: {
        provider: persistenceProvider,
        durable,
      },
      database: { status: databaseStatus },
      goldenDataset,
      providers,
      parcelSources,
      activeParcelProvider,
      fallbackAvailable,
      reportGeneration: {
        status: fontsAvailable() ? 'ready' : 'missing',
        format: 'pdf',
        endpoint: 'GET /api/analyses/:analysisId/report.pdf',
      },
      warnings,
    });
  });

  return router;
}
