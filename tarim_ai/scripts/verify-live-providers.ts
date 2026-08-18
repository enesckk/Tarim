import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getEnv, resetEnvCache } from '../src/config/env.js';
import { copernicusAuthService } from '../src/services/copernicus-auth.service.js';
import { copernicusCatalogService } from '../src/services/copernicus-catalog.service.js';
import { TkgmParcelProvider } from '../src/modules/parcel/providers/tkgm-parcel.provider.js';
import {
  NasaPowerClimateProvider,
  nasaPowerConfigFromEnv,
} from '../src/modules/environment/climate/providers/nasa-power-climate.provider.js';
import {
  SoilGridsSoilProvider,
  soilGridsConfigFromEnv,
} from '../src/modules/environment/soil/providers/soilgrids-soil.provider.js';
import {
  CopernicusDemProvider,
  copernicusDemConfigFromEnv,
} from '../src/modules/terrain/providers/copernicus-dem.provider.js';
import { getPolygonAreaSqMeters } from '../src/utils/geometry.utils.js';
import type { FeatureCollection, NormalizedGeometry } from '../src/types/geojson.types.js';

type CheckResult = {
  provider: string;
  ok: boolean;
  durationMs: number;
  detail: string;
};

const results: CheckResult[] = [];

async function check(provider: string, operation: () => Promise<string>): Promise<void> {
  const started = Date.now();
  try {
    const detail = await operation();
    results.push({ provider, ok: true, durationMs: Date.now() - started, detail });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ provider, ok: false, durationMs: Date.now() - started, detail });
  }
}

async function loadDemoGeometry(): Promise<NormalizedGeometry> {
  const path = resolve(process.cwd(), 'data/parcels/gungurge-108-7.geojson');
  const document = JSON.parse(await readFile(path, 'utf8')) as FeatureCollection;
  const geometry = document.features[0]?.geometry;
  if (!geometry) throw new Error('Demo parcel geometry is missing');
  return geometry;
}

async function main(): Promise<void> {
  process.env.ANALYSIS_DATA_MODE = 'live';
  process.env.PARCEL_PROVIDER = 'tkgm';
  process.env.CLIMATE_PROVIDER = 'nasa-power';
  process.env.SOIL_PROVIDER = 'soilgrids';
  process.env.TERRAIN_PROVIDER = 'copernicus-dem';
  process.env.TERRAIN_DEM_ENABLED = 'true';
  resetEnvCache();

  const env = getEnv();
  const geometry = await loadDemoGeometry();
  const centroid = { longitude: 37.4752, latitude: 37.2065 };
  const area = getPolygonAreaSqMeters(geometry);

  await check('Copernicus authentication', async () => {
    const token = await copernicusAuthService.getAccessToken();
    return token.length > 20 ? 'token received' : 'invalid token';
  });

  await check('Copernicus Sentinel catalog', async () => {
    const products = await copernicusCatalogService.search({ geometry, days: 60, limit: 20 });
    return `${products.length} Sentinel-2 product(s)`;
  });

  await check('TKGM parcel', async () => {
    const parcel = await new TkgmParcelProvider().resolve({
      province: 'Gaziantep',
      district: 'Şehitkamil',
      neighborhood: 'Güngürge',
      block: '108',
      parcel: '7',
    });
    return `${parcel.provider}; geometry=${parcel.geometry.type}`;
  });

  await check('NASA POWER climate', async () => {
    const profile = await new NasaPowerClimateProvider(
      nasaPowerConfigFromEnv(env),
    ).getProfile({ centroid, years: 3 });
    return `${profile.provider}; completeness=${String(profile.metadata.dataCompleteness)}`;
  });

  await check('SoilGrids soil', async () => {
    const profile = await new SoilGridsSoilProvider(
      soilGridsConfigFromEnv(env),
    ).getProfile({ centroid });
    return `${profile.provider}; pH=${profile.soil.ph}`;
  });

  await check('Copernicus DEM', async () => {
    const grid = await new CopernicusDemProvider(
      copernicusDemConfigFromEnv(env),
    ).getDemGrid({ geometry, centroid, parcelAreaSquareMeters: area });
    return `${grid.provider}; validPixels=${String(grid.metadata.validPixelCount ?? 0)}`;
  });

  for (const result of results) {
    const mark = result.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${result.provider} (${result.durationMs}ms): ${result.detail}`);
  }

  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    process.exitCode = 1;
    console.error(`Live provider verification failed: ${failures.length}/${results.length}`);
  } else {
    console.log(`Live provider verification passed: ${results.length}/${results.length}`);
  }
}

await main();
