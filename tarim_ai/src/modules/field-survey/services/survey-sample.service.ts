import type { Geometry } from 'geojson';
import type { FieldSurveyCalibration } from '../constants/field-survey-calibration.js';
import type {
  SamplingMethod,
  SurveySample,
  SurfaceStoninessClass,
  BedrockOutcropClass,
  DrainageObservationClass,
} from '../types/field-survey.types.js';
import { createId } from '../utils/id.utils.js';
import { validateSampleGps } from './survey-gps.service.js';
import {
  sampleHasCriticalErrors,
  stoninessConsistencyWarning,
  validateDepthValue,
} from './survey-validation.service.js';
import { ApiError } from '../../../utils/api-error.js';

export interface AddSampleInput {
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
  };
  rootableSoilDepthCm?: number | null;
  surfaceStoniness?: SurfaceStoninessClass;
  estimatedSurfaceStonePercent?: number | null;
  bedrockObserved?: boolean;
  bedrockOutcrop?: BedrockOutcropClass;
  estimatedOutcropPercent?: number | null;
  drainageObservation?: DrainageObservationClass;
  soilMoistureCondition?: 'dry' | 'moist' | 'wet' | 'unknown';
  samplingMethod?: SamplingMethod;
  depthMeasurementMethod?: SamplingMethod;
  notes?: string;
}

export class SurveySampleService {
  createSample(
    input: AddSampleInput,
    sequence: number,
    geometry: Geometry,
    calibration: FieldSurveyCalibration,
  ): SurveySample {
    const gps = validateSampleGps(input.location, geometry, calibration);
    const warnings = [...gps.warnings];

    if (input.rootableSoilDepthCm != null) {
      const depthCheck = validateDepthValue(
        input.rootableSoilDepthCm,
        calibration,
      );
      if (!depthCheck.valid) {
        throw new ApiError(400, depthCheck.message ?? 'Invalid depth', {
          code: 'FIELD_SURVEY_DEPTH_MEASUREMENTS_VALID',
        });
      }
      if (!input.samplingMethod && !input.depthMeasurementMethod) {
        throw new ApiError(
          400,
          'Depth measurement requires samplingMethod or depthMeasurementMethod',
          { code: 'FIELD_SURVEY_DEPTH_MEASUREMENTS_VALID' },
        );
      }
    }

    if (
      input.estimatedSurfaceStonePercent != null &&
      (input.estimatedSurfaceStonePercent < 0 ||
        input.estimatedSurfaceStonePercent > 100 ||
        !Number.isFinite(input.estimatedSurfaceStonePercent))
    ) {
      throw new ApiError(400, 'estimatedSurfaceStonePercent must be 0–100');
    }

    if (
      input.estimatedOutcropPercent != null &&
      (input.estimatedOutcropPercent < 0 ||
        input.estimatedOutcropPercent > 100 ||
        !Number.isFinite(input.estimatedOutcropPercent))
    ) {
      throw new ApiError(400, 'estimatedOutcropPercent must be 0–100');
    }

    const stoninessWarn = stoninessConsistencyWarning(
      input.surfaceStoniness,
      input.estimatedSurfaceStonePercent,
    );
    if (stoninessWarn) {
      warnings.push(stoninessWarn);
    }

    const sample: SurveySample = {
      id: createId(),
      sequence,
      location: {
        latitude: input.location.latitude,
        longitude: input.location.longitude,
        accuracyMeters: input.location.accuracyMeters ?? null,
      },
      insideParcel: gps.insideParcel,
      distanceToParcelMeters: gps.distanceToParcelMeters,
      locationConfidence: gps.locationConfidence,
      acceptance: gps.acceptance,
      acceptanceWarnings: warnings,
      rootableSoilDepthCm: input.rootableSoilDepthCm ?? null,
      surfaceStoniness: input.surfaceStoniness,
      estimatedSurfaceStonePercent: input.estimatedSurfaceStonePercent ?? null,
      bedrockObserved: input.bedrockObserved,
      bedrockOutcrop: input.bedrockOutcrop,
      estimatedOutcropPercent: input.estimatedOutcropPercent ?? null,
      drainageObservation: input.drainageObservation,
      soilMoistureCondition: input.soilMoistureCondition,
      samplingMethod: input.samplingMethod,
      depthMeasurementMethod: input.depthMeasurementMethod,
      notes: input.notes,
    };

    const critical = sampleHasCriticalErrors(sample, calibration);
    if (critical.length > 0 && gps.acceptance === 'invalid') {
      // still allow storing invalid samples for audit, but mark acceptance
      sample.acceptanceWarnings = [...warnings, ...critical];
    }

    return sample;
  }
}
