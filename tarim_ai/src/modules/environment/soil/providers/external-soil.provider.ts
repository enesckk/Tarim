import axios from 'axios';
import { getEnv } from '../../../../config/env.js';
import { ApiError } from '../../../../utils/api-error.js';
import type { SoilProvider } from './soil-provider.interface.js';
import type { SoilProfile, SoilProviderInput } from '../types/soil.types.js';
import { soilProfileSchema } from '../schemas/soil.schema.js';

/**
 * Placeholder HTTP soil provider.
 * Requires EXTERNAL_SOIL_BASE_URL when SOIL_PROVIDER=external.
 */
export class ExternalSoilProvider implements SoilProvider {
  readonly name = 'external';

  async getProfile(input: SoilProviderInput): Promise<SoilProfile> {
    const env = getEnv();
    const baseUrl = env.EXTERNAL_SOIL_BASE_URL?.replace(/\/$/, '');
    if (!baseUrl) {
      throw new ApiError(502, 'Soil provider is unavailable.');
    }

    try {
      const response = await axios.post(
        `${baseUrl}/profile`,
        {
          longitude: input.centroid.longitude,
          latitude: input.centroid.latitude,
          parcel: input.parcel,
        },
        {
          timeout: env.EXTERNAL_SOIL_TIMEOUT_MS,
          headers: { Accept: 'application/json' },
        },
      );

      const parsed = soilProfileSchema.safeParse(response.data);
      if (!parsed.success) {
        console.error('[ExternalSoilProvider] invalid response schema', {
          issues: parsed.error.issues.map((i) => i.message),
        });
        throw new ApiError(502, 'Soil provider returned an invalid response.');
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
        throw new ApiError(504, 'Soil provider timed out.');
      }
      console.error('[ExternalSoilProvider] request failed', {
        message: error instanceof Error ? error.message : 'unknown',
      });
      throw new ApiError(502, 'Soil provider is unavailable.');
    }
  }
}
