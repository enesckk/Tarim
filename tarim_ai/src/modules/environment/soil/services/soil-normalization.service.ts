import { ApiError } from '../../../../utils/api-error.js';
import { soilProfileSchema } from '../schemas/soil.schema.js';
import type { SoilProfile } from '../types/soil.types.js';

export class SoilNormalizationService {
  normalize(profile: SoilProfile): SoilProfile {
    const parsed = soilProfileSchema.safeParse(profile);
    if (!parsed.success) {
      console.error('[SoilNormalization] invalid profile', {
        issues: parsed.error.issues.map((i) => i.message),
      });
      throw new ApiError(502, 'Soil provider returned an invalid response.');
    }
    return parsed.data;
  }
}
