import type { NormalizedGeometry } from '../types/geojson.types.js';
import type { NdviStatisticsResponse } from '../types/satellite.types.js';
import { indexStatisticsService } from './index-statistics.service.js';

export interface NdviStatisticsRequest {
  geometry: NormalizedGeometry;
  days: number;
}

/**
 * Backward-compatible NDVI statistics facade.
 * Response shape for /best/ndvi-statistics remains unchanged.
 */
class NdviStatisticsService {
  async computeBestNdviStatistics(
    request: NdviStatisticsRequest,
  ): Promise<NdviStatisticsResponse> {
    return indexStatisticsService.computeBestNdviStatistics(request);
  }
}

export const ndviStatisticsService = new NdviStatisticsService();
