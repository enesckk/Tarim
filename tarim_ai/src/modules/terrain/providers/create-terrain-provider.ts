import { getEnv } from '../../../config/env.js';
import type { TerrainProvider } from './terrain-provider.interface.js';
import { MockTerrainProvider } from './mock-terrain.provider.js';
import {
  CopernicusDemProvider,
  copernicusDemConfigFromEnv,
} from './copernicus-dem.provider.js';
import { FallbackTerrainProvider } from './fallback-terrain.provider.js';

export function createTerrainProvider(): TerrainProvider {
  const env = getEnv();

  switch (env.TERRAIN_PROVIDER) {
    case 'copernicus-dem':
      return new CopernicusDemProvider(copernicusDemConfigFromEnv(env));
    case 'fallback':
      return new FallbackTerrainProvider(
        new CopernicusDemProvider(copernicusDemConfigFromEnv(env)),
        new MockTerrainProvider(),
      );
    case 'mock':
    default:
      return new MockTerrainProvider();
  }
}
