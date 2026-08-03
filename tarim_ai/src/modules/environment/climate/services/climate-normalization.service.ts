import { ApiError } from '../../../../utils/api-error.js';
import { climateProfileSchema } from '../schemas/climate.schema.js';
import type { ClimateProfile } from '../types/climate.types.js';

export class ClimateNormalizationService {
  normalize(profile: ClimateProfile): ClimateProfile {
    const parsed = climateProfileSchema.safeParse(profile);
    if (!parsed.success) {
      console.error('[ClimateNormalization] invalid profile', {
        issues: parsed.error.issues.map((i) => i.message),
      });
      throw new ApiError(502, 'Climate provider returned an invalid response.');
    }
    return parsed.data;
  }
}
