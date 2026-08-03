import { getEnv } from '../../../../config/env.js';
import type { SoilProvider } from './soil-provider.interface.js';
import { MockSoilProvider } from './mock-soil.provider.js';
import { ExternalSoilProvider } from './external-soil.provider.js';
import {
  SoilGridsSoilProvider,
  soilGridsConfigFromEnv,
} from './soilgrids-soil.provider.js';
import { FallbackSoilProvider } from './fallback-soil.provider.js';

export function createSoilProvider(): SoilProvider {
  const env = getEnv();

  switch (env.SOIL_PROVIDER) {
    case 'soilgrids':
      return new SoilGridsSoilProvider(soilGridsConfigFromEnv(env));
    case 'fallback':
      return new FallbackSoilProvider(
        new SoilGridsSoilProvider(soilGridsConfigFromEnv(env)),
        new MockSoilProvider(),
      );
    case 'external':
      return new ExternalSoilProvider();
    case 'mock':
    default:
      return new MockSoilProvider();
  }
}
