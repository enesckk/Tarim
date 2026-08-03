import type { RiskLevel, ProviderLocation, ProviderMetadata, ParcelContext } from '../../environment/shared/types/provider-metadata.types.js';

export type SlopeClass =
  | 'flat'
  | 'gentle'
  | 'moderate'
  | 'steep'
  | 'very_steep'
  | 'unknown';

export type AspectDirection =
  | 'north'
  | 'northeast'
  | 'east'
  | 'southeast'
  | 'south'
  | 'southwest'
  | 'west'
  | 'northwest'
  | 'flat'
  | 'mixed'
  | 'unknown';

export type RuggednessClass =
  | 'very_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high'
  | 'unknown';

export type MechanizationSuitability =
  | 'suitable'
  | 'partially_suitable'
  | 'limited'
  | 'strongly_limited'
  | 'unknown';

/** Spec-facing mechanization labels (additive mapping). */
export type TerrainMechanizationClassification =
  | 'suitable'
  | 'generally_suitable'
  | 'limited'
  | 'strongly_limited'
  | 'insufficient_data';

export type TerrainVariabilityClass =
  | 'very_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high'
  | 'insufficient_data';

export type CoverageStatus = 'complete' | 'adequate' | 'partial' | 'insufficient';

export type SpatialConfidence = RiskLevel | 'insufficient';

export interface TerrainProviderInput {
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: unknown;
  };
  centroid: ProviderLocation;
  parcelAreaSquareMeters: number;
  parcel?: ParcelContext;
}

/** Raw DEM grid returned by providers for deterministic terrain analysis. */
export interface DemSampleGrid {
  width: number;
  height: number;
  /** Approximate west (min lon) of grid. */
  west: number;
  /** Approximate south (min lat) of grid. */
  south: number;
  /** Cell size in degrees (lon). */
  cellSizeDegreesX: number;
  /** Cell size in degrees (lat). */
  cellSizeDegreesY: number;
  resolutionMeters: number;
  /** Row-major elevations; null = NoData. */
  elevations: Array<number | null>;
  provider: string;
  providerStatus?: 'ok' | 'not_configured' | 'unavailable';
  isMock: boolean;
  isEstimated: boolean;
  fallbackUsed: boolean;
  limitations: string[];
  metadata: ProviderMetadata & {
    providerMode?: string;
    fallbackFrom?: string;
    dataset?: string;
    demInstance?: string;
    requestedResolutionMeters?: number;
    effectiveResolutionMeters?: number;
    processWidth?: number;
    processHeight?: number;
    insideParcelPixelCount?: number;
    noDataPixelCount?: number;
    validPixelCount?: number;
    parcelAreaSquareMeters?: number;
  };
}

export interface ElevationStats {
  minimumMeters: number;
  maximumMeters: number;
  meanMeters: number;
  medianMeters: number;
  rangeMeters: number;
  standardDeviationMeters: number;
  validSampleCount: number;
  /** Additive percentiles */
  p10Meters?: number;
  p90Meters?: number;
  validPixelCount?: number;
}

export interface SlopeDistribution {
  zeroToFivePercent: number;
  fiveToTwelvePercent: number;
  twelveToTwentyPercent: number;
  twentyToThirtyFivePercent: number;
  aboveThirtyFivePercent: number;
}

export interface SlopeStats {
  meanPercent: number;
  medianPercent: number;
  maximumPercent: number;
  p90Percent: number;
  standardDeviationPercent: number;
  classification: SlopeClass;
  distribution: SlopeDistribution;
  /** Additive fields */
  unit?: 'percent';
  minimumPercent?: number;
  p10Percent?: number;
  p50Percent?: number;
  p95Percent?: number;
  validPixelCount?: number;
  meanDegrees?: number;
  medianDegrees?: number;
  maximumDegrees?: number;
}

export interface AspectStats {
  dominantDirection: AspectDirection;
  dominantPercent: number;
  northFacingPercent: number;
  southFacingPercent: number;
  eastFacingPercent: number;
  westFacingPercent: number;
  flatPercent: number;
  /** Additive circular statistics */
  circularMeanDegrees?: number | null;
  aspectConcentration?: number | null;
  dominantDegrees?: number | null;
}

export interface RuggednessStats {
  meanIndex: number;
  medianIndex: number;
  p90Index: number;
  maximumIndex: number;
  classification: RuggednessClass;
  method?: string;
  validPixelCount?: number;
  index?: number;
}

export interface MechanizationLimitingFactor {
  code: string;
  severity: 'low' | 'medium' | 'high';
  value?: number;
  unit?: string;
}

export interface MechanizationAssessment {
  terrainSuitability: MechanizationSuitability;
  confidence: RiskLevel;
  limitingFactors: MechanizationLimitingFactor[];
  limitations: string[];
}

export interface TerrainCoverageSummary {
  parcelAreaSquareMeters: number;
  rasterCoveredAreaSquareMeters: number;
  validAreaSquareMeters: number;
  validPixelRatio: number;
  insideParcelPixelCount: number;
  validPixelCount: number;
  noDataPixelCount: number;
  rasterWidth: number;
  rasterHeight: number;
  coverageStatus: CoverageStatus;
}

export interface TerrainVariabilitySummary {
  elevationRangeMeters: number;
  elevationStandardDeviationMeters: number;
  slopeP90Percent: number;
  ruggednessClass: RuggednessClass;
  classification: TerrainVariabilityClass;
}

export interface TerrainMechanizationSuitabilitySummary {
  classification: TerrainMechanizationClassification;
  basedOn: string[];
  confidence: string;
}

export interface TerrainProviderSummary {
  name: string;
  dataset: string | null;
  isMock: boolean;
  fallbackUsed: boolean;
  requestedResolutionMeters: number;
  effectiveResolutionMeters: number;
}

export interface TerrainBlock {
  elevation: ElevationStats;
  slope: SlopeStats;
  aspect: AspectStats;
  ruggedness: RuggednessStats;
  mechanization: MechanizationAssessment;
  /** Additive summaries */
  coverage?: TerrainCoverageSummary;
  terrainVariability?: TerrainVariabilitySummary;
  terrainMechanizationSuitability?: TerrainMechanizationSuitabilitySummary;
  provider?: TerrainProviderSummary;
}

export interface TerrainProfileMetadata {
  provider: string;
  providerMode: string;
  resolutionMeters: number;
  parcelAreaSquareMeters: number;
  validPixelCount: number;
  coverageRatio: number;
  spatialConfidence: SpatialConfidence;
  isEstimated: boolean;
  isMock: boolean;
  fallbackUsed: boolean;
  generatedAt: string;
  providerStatus?: string;
  dataset?: string;
  requestedResolutionMeters?: number;
  effectiveResolutionMeters?: number;
  cacheHit?: boolean;
  cacheKey?: string;
  usedInDecision?: boolean;
}

export interface TerrainAuditSummary {
  provider: string;
  dataset: string | null;
  isMock: boolean;
  fallbackUsed: boolean;
  cacheHit: boolean;
  coverageStatus?: CoverageStatus;
  spatialConfidence: SpatialConfidence;
  calibrationVersion?: string;
}

export interface TerrainCheckResult {
  code: string;
  status: 'passed' | 'warning' | 'failed' | 'informational';
  message: string;
  observedValue?: string | number | boolean | null;
  threshold?: string | number | null;
  expectedValue?: string | number | boolean | null;
  source?: string;
}

export interface TerrainProfileResponse {
  parcel: {
    title: string | null;
    areaSquareMeters: number | null;
    landType: string | null;
    geometryType: string;
  };
  terrain: TerrainBlock;
  metadata: TerrainProfileMetadata;
  limitations: string[];
  validation?: { checks: TerrainCheckResult[] };
  audit?: TerrainAuditSummary;
  confidence?: SpatialConfidence;
}
