import { getEnv } from '../../../../config/env.js';
import type { ClimateProvider } from './climate-provider.interface.js';
import { MockClimateProvider } from './mock-climate.provider.js';
import { ExternalClimateProvider } from './external-climate.provider.js';
import {
  NasaPowerClimateProvider,
  nasaPowerConfigFromEnv,
} from './nasa-power-climate.provider.js';
import { FallbackClimateProvider } from './fallback-climate.provider.js';

export function createClimateProvider(): ClimateProvider {
  const env = getEnv();

  switch (env.CLIMATE_PROVIDER) {
    case 'nasa-power':
      return new NasaPowerClimateProvider(nasaPowerConfigFromEnv(env));
    case 'fallback':
      return new FallbackClimateProvider(
        new NasaPowerClimateProvider(nasaPowerConfigFromEnv(env)),
        new MockClimateProvider(),
      );
    case 'external':
      return new ExternalClimateProvider();
    case 'mock':
    default:
      return new MockClimateProvider();
  }
}
