import type { TerrainCalibration } from '../../terrain/config/terrain-calibration.js';
import type { SurfaceCalibration } from '../../satellite/surface-analysis/surface-calibration.js';
import type { LandUsabilityCalibration } from '../../land-usability/constants/land-usability-calibration.js';
import type { FieldSurveyCalibration } from '../../field-survey/constants/field-survey-calibration.js';

export interface CalibrationProfile {
  version: string;
  climateWeight: number;
  soilWeight: number;
  sentinelWeight: number;
  reliabilityWeight: number;
  climateSubWeights: {
    growingSeasonTemperature: number;
    precipitation: number;
    frostCompatibility: number;
    extremeHeatCompatibility: number;
    droughtCompatibility: number;
    irrigationCompatibility: number;
  };
  constraintPenalties: {
    critical: number;
    major: number;
    moderate: number;
  };
  classificationThresholds: {
    veryHigh: number;
    high: number;
    moderate: number;
    low: number;
  };
  scenarioLimits: {
    maximumManagementImprovement: number;
  };
  /** Optional terrain thresholds (v1.2+). */
  terrain?: TerrainCalibration;
  /** Optional surface analysis thresholds (v1.3+). */
  surface?: SurfaceCalibration;
  /** Optional land usability thresholds (v1.4+). */
  landUsability?: LandUsabilityCalibration;
  /** Optional field survey thresholds (v1.5+). */
  fieldSurvey?: FieldSurveyCalibration;
  /** Optional crop physical compatibility thresholds (v1.7+). */
  cropPhysicalCompatibility?: import('../../crop-physical-compatibility/constants/crop-physical-compatibility-calibration.js').CropPhysicalCompatibilityCalibration;
  /** Optional calibration management / expert validation thresholds (v1.8+). */
  calibrationManagement?: import('../../calibration-management/types/calibration-management.types.js').CalibrationManagementCalibration;
  /** Optional persistence / database thresholds (v1.9+). */
  persistence?: {
    provider: { default: string; supported: string[] };
    database: {
      connectionTimeoutMs: number;
      statementTimeoutMs: number;
      poolMax: number;
      autoMigrate: boolean;
    };
    optimisticConcurrency: {
      enabled: boolean;
      requiredForPublishedResources: boolean;
    };
    idempotency: { enabled: boolean; ttlSeconds: number };
    audit: { useSequenceNumbers: boolean };
    validationStatus: string;
    source: string;
  };
  /** Optional operations / observability thresholds (v2.0+). */
  operations?: {
    idempotency: {
      enabled: boolean;
      requiredForCriticalWrites: boolean;
      ttlSeconds: number;
      replayClientErrors: boolean;
      inProgressStatusCode: number;
      maximumKeyLength: number;
    };
    correlation: {
      enabled: boolean;
      headerName: string;
      generateWhenMissing: boolean;
    };
    logging: {
      structured: boolean;
      slowRequestThresholdMs: number;
      redactSensitiveFields: boolean;
    };
    metrics: {
      enabled: boolean;
      provider: string;
    };
    validationStatus: string;
    source: string;
  };
  notes: string[];
}
