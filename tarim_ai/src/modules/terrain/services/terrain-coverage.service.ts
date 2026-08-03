import type {
  CoverageStatus,
  DemSampleGrid,
  ElevationStats,
  MechanizationAssessment,
  MechanizationSuitability,
  RuggednessStats,
  SlopeStats,
  TerrainCoverageSummary,
  TerrainMechanizationClassification,
  TerrainMechanizationSuitabilitySummary,
  TerrainVariabilityClass,
  TerrainVariabilitySummary,
} from '../types/terrain.types.js';
import type { TerrainCalibration } from '../config/terrain-calibration.js';
import { round3 } from '../utils/terrain-stats.utils.js';
import { pointInGeometry } from '../utils/dem-grid.utils.js';
import { cellCenter } from '../utils/dem-grid.utils.js';
import type { NormalizedGeometry } from '../../../types/geojson.types.js';

export function mapMechanizationClassification(
  suitability: MechanizationSuitability,
): TerrainMechanizationClassification {
  switch (suitability) {
    case 'suitable':
      return 'suitable';
    case 'partially_suitable':
      return 'generally_suitable';
    case 'limited':
      return 'limited';
    case 'strongly_limited':
      return 'strongly_limited';
    default:
      return 'insufficient_data';
  }
}

export function buildMechanizationSuitabilitySummary(
  mechanization: MechanizationAssessment,
): TerrainMechanizationSuitabilitySummary {
  return {
    classification: mapMechanizationClassification(mechanization.terrainSuitability),
    basedOn: ['MEAN_SLOPE', 'P90_SLOPE', 'RUGGEDNESS'],
    confidence: mechanization.confidence,
  };
}

export function classifyTerrainVariability(input: {
  elevation: ElevationStats;
  slope: SlopeStats;
  ruggedness: RuggednessStats;
}): TerrainVariabilitySummary {
  const { elevation, slope, ruggedness } = input;
  if (elevation.validSampleCount < 1 || slope.classification === 'unknown') {
    return {
      elevationRangeMeters: elevation.rangeMeters,
      elevationStandardDeviationMeters: elevation.standardDeviationMeters,
      slopeP90Percent: slope.p90Percent,
      ruggednessClass: ruggedness.classification,
      classification: 'insufficient_data',
    };
  }

  let score = 0;
  if (elevation.rangeMeters > 40) score += 2;
  else if (elevation.rangeMeters > 20) score += 1;
  if (elevation.standardDeviationMeters > 15) score += 2;
  else if (elevation.standardDeviationMeters > 8) score += 1;
  if (slope.p90Percent > 35) score += 2;
  else if (slope.p90Percent > 20) score += 1;
  if (
    ruggedness.classification === 'high' ||
    ruggedness.classification === 'very_high'
  ) {
    score += 2;
  } else if (ruggedness.classification === 'medium') {
    score += 1;
  }

  let classification: TerrainVariabilityClass;
  if (score <= 1) classification = 'very_low';
  else if (score <= 2) classification = 'low';
  else if (score <= 4) classification = 'medium';
  else if (score <= 6) classification = 'high';
  else classification = 'very_high';

  return {
    elevationRangeMeters: elevation.rangeMeters,
    elevationStandardDeviationMeters: elevation.standardDeviationMeters,
    slopeP90Percent: slope.p90Percent,
    ruggednessClass: ruggedness.classification,
    classification,
  };
}

export function buildCoverageSummary(input: {
  grid: DemSampleGrid;
  geometry: NormalizedGeometry;
  parcelAreaSquareMeters: number;
  validPixelCount: number;
  calibration: TerrainCalibration;
}): TerrainCoverageSummary {
  const { grid, geometry, parcelAreaSquareMeters, validPixelCount, calibration } =
    input;

  let insideParcelPixelCount = 0;
  let noDataPixelCount = 0;
  for (let row = 0; row < grid.height; row += 1) {
    for (let col = 0; col < grid.width; col += 1) {
      const { lon, lat } = cellCenter(grid, col, row);
      if (!pointInGeometry(lon, lat, geometry)) continue;
      insideParcelPixelCount += 1;
      const value = grid.elevations[row * grid.width + col];
      if (value == null || !Number.isFinite(value)) {
        noDataPixelCount += 1;
      }
    }
  }

  const cellArea =
    Math.max(1, grid.resolutionMeters) * Math.max(1, grid.resolutionMeters);
  const validAreaSquareMeters = validPixelCount * cellArea;
  const rasterCoveredAreaSquareMeters = insideParcelPixelCount * cellArea;
  const ratioRaw =
    insideParcelPixelCount > 0 ? validPixelCount / insideParcelPixelCount : 0;
  const validPixelRatio = round3(Math.min(1, Math.max(0, ratioRaw)));

  const dem = calibration.dem ?? {};
  const complete = dem.completeValidPixelRatio ?? 0.95;
  const adequate = dem.adequateValidPixelRatio ?? 0.85;
  const minimum = dem.minimumValidPixelRatio ?? 0.7;

  let coverageStatus: CoverageStatus;
  if (validPixelCount < (calibration.minimumDemPixels.lowConfidence ?? 3)) {
    coverageStatus = 'insufficient';
  } else if (validPixelRatio >= complete) {
    coverageStatus = 'complete';
  } else if (validPixelRatio >= adequate) {
    coverageStatus = 'adequate';
  } else if (validPixelRatio >= minimum) {
    coverageStatus = 'partial';
  } else {
    coverageStatus = 'insufficient';
  }

  return {
    parcelAreaSquareMeters: round3(parcelAreaSquareMeters),
    rasterCoveredAreaSquareMeters: round3(rasterCoveredAreaSquareMeters),
    validAreaSquareMeters: round3(validAreaSquareMeters),
    validPixelRatio,
    insideParcelPixelCount,
    validPixelCount,
    noDataPixelCount,
    rasterWidth: grid.width,
    rasterHeight: grid.height,
    coverageStatus,
  };
}
