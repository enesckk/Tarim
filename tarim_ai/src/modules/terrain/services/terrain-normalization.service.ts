import { z } from 'zod';
import type {
  TerrainBlock,
  TerrainProfileResponse,
} from '../types/terrain.types.js';
import { ApiError } from '../../../utils/api-error.js';

const elevationSchema = z.object({
  minimumMeters: z.number().finite(),
  maximumMeters: z.number().finite(),
  meanMeters: z.number().finite(),
  medianMeters: z.number().finite(),
  rangeMeters: z.number().finite().nonnegative(),
  standardDeviationMeters: z.number().finite().nonnegative(),
  validSampleCount: z.number().int().nonnegative(),
});

const slopeSchema = z.object({
  meanPercent: z.number().finite().nonnegative(),
  medianPercent: z.number().finite().nonnegative(),
  maximumPercent: z.number().finite().nonnegative(),
  p90Percent: z.number().finite().nonnegative(),
  standardDeviationPercent: z.number().finite().nonnegative(),
  classification: z.string(),
  distribution: z.object({
    zeroToFivePercent: z.number().finite().nonnegative(),
    fiveToTwelvePercent: z.number().finite().nonnegative(),
    twelveToTwentyPercent: z.number().finite().nonnegative(),
    twentyToThirtyFivePercent: z.number().finite().nonnegative(),
    aboveThirtyFivePercent: z.number().finite().nonnegative(),
  }),
});

export class TerrainNormalizationService {
  normalize(response: TerrainProfileResponse): TerrainProfileResponse {
    try {
      elevationSchema.parse(response.terrain.elevation);
      slopeSchema.parse(response.terrain.slope);
      assertElevationOrder(response.terrain);
      assertNoInvalidNumbers(response);
      return response;
    } catch (error) {
      throw new ApiError(502, 'Terrain profile normalization failed', {
        message: error instanceof Error ? error.message : undefined,
      });
    }
  }
}

function assertElevationOrder(terrain: TerrainBlock): void {
  const e = terrain.elevation;
  if (!(e.minimumMeters <= e.medianMeters && e.medianMeters <= e.maximumMeters)) {
    throw new Error('elevation order invariant violated');
  }
  if (Math.abs(e.rangeMeters - (e.maximumMeters - e.minimumMeters)) > 0.2) {
    throw new Error('elevation range invariant violated');
  }
}

function assertNoInvalidNumbers(value: unknown, path = 'root'): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`non-finite number at ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoInvalidNumbers(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      assertNoInvalidNumbers(child, `${path}.${key}`);
    }
  }
}
