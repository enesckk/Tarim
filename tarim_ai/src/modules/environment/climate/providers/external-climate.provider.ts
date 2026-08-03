import axios from 'axios';
import { getEnv } from '../../../../config/env.js';
import { ApiError } from '../../../../utils/api-error.js';
import type { ClimateProvider } from './climate-provider.interface.js';
import type { ClimateProfile, ClimateProviderInput } from '../types/climate.types.js';
import { climateProfileSchema } from '../schemas/climate.schema.js';

/**
 * Placeholder HTTP climate provider.
 * Requires EXTERNAL_CLIMATE_BASE_URL when CLIMATE_PROVIDER=external.
 */
export class ExternalClimateProvider implements ClimateProvider {
  readonly name = 'external';

  async getProfile(input: ClimateProviderInput): Promise<ClimateProfile> {
    const env = getEnv();
    const baseUrl = env.EXTERNAL_CLIMATE_BASE_URL?.replace(/\/$/, '');
    if (!baseUrl) {
      throw new ApiError(502, 'Climate provider is unavailable.');
    }

    try {
      const response = await axios.post(
        `${baseUrl}/profile`,
        {
          longitude: input.centroid.longitude,
          latitude: input.centroid.latitude,
          years: input.years,
          parcel: input.parcel,
        },
        {
          timeout: env.EXTERNAL_CLIMATE_TIMEOUT_MS,
          headers: { Accept: 'application/json' },
        },
      );

      const parsed = climateProfileSchema.safeParse(response.data);
      if (!parsed.success) {
        console.error('[ExternalClimateProvider] invalid response schema', {
          issues: parsed.error.issues.map((i) => i.message),
        });
        throw new ApiError(502, 'Climate provider returned an invalid response.');
      }

      return {
        ...parsed.data,
        provider: 'external',
        metadata: {
          ...parsed.data.metadata,
          isMock: false,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        throw new ApiError(504, 'Climate provider timed out.');
      }
      console.error('[ExternalClimateProvider] request failed', {
        message: error instanceof Error ? error.message : 'unknown',
      });
      throw new ApiError(502, 'Climate provider is unavailable.');
    }
  }
}
