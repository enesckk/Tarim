import type { SpatialConfidence } from '../types/terrain.types.js';
import type { TerrainCalibration } from '../config/terrain-calibration.js';

export class TerrainConfidenceService {
  resolve(input: {
    validPixelCount: number;
    coverageRatio: number;
    isMock: boolean;
    calibration: TerrainCalibration;
  }): SpatialConfidence {
    const { validPixelCount, coverageRatio, isMock, calibration } = input;
    const pixels = calibration.minimumDemPixels;
    const coverage = calibration.minimumCoverageRatio;

    let byPixels: SpatialConfidence;
    if (validPixelCount >= pixels.highConfidence) byPixels = 'high';
    else if (validPixelCount >= pixels.mediumConfidence) byPixels = 'medium';
    else if (validPixelCount >= pixels.lowConfidence) byPixels = 'low';
    else byPixels = 'insufficient';

    let byCoverage: SpatialConfidence;
    if (coverageRatio >= coverage.highConfidence) byCoverage = 'high';
    else if (coverageRatio >= coverage.mediumConfidence) byCoverage = 'medium';
    else if (coverageRatio >= coverage.lowConfidence) byCoverage = 'low';
    else byCoverage = 'insufficient';

    const rank: Record<SpatialConfidence, number> = {
      insufficient: 0,
      low: 1,
      medium: 2,
      high: 3,
    };
    const combined =
      rank[byPixels] <= rank[byCoverage] ? byPixels : byCoverage;

    // Mock data must not claim high confidence
    if (isMock && combined === 'high') {
      return 'medium';
    }
    return combined;
  }
}
