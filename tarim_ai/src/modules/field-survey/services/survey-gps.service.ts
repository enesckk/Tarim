import * as turf from '@turf/turf';
import type { Feature, Geometry, MultiPolygon, Polygon } from 'geojson';
import type { FieldSurveyCalibration } from '../constants/field-survey-calibration.js';
import type {
  LocationConfidence,
  SampleAcceptance,
  SampleLocation,
} from '../types/field-survey.types.js';

export interface GpsValidationResult {
  insideParcel: boolean;
  distanceToParcelMeters: number;
  locationConfidence: LocationConfidence;
  acceptance: SampleAcceptance;
  warnings: string[];
}

function toFeature(geometry: Geometry): Feature<Polygon | MultiPolygon> {
  if (geometry.type === 'Polygon') {
    return turf.polygon(geometry.coordinates as number[][][]);
  }
  if (geometry.type === 'MultiPolygon') {
    return turf.multiPolygon(geometry.coordinates as number[][][][]);
  }
  throw new Error(`Unsupported geometry type: ${geometry.type}`);
}

export function validateSampleGps(
  location: SampleLocation,
  geometry: Geometry,
  calibration: FieldSurveyCalibration,
): GpsValidationResult {
  const feature = toFeature(geometry);
  const point = turf.point([location.longitude, location.latitude]);
  const insideParcel = turf.booleanPointInPolygon(point, feature);
  const distanceToParcelMeters = insideParcel
    ? 0
    : turf.pointToPolygonDistance(point, feature, { units: 'meters' });

  const accuracy = location.accuracyMeters ?? null;
  const warnings: string[] = [];
  const loc = calibration.location;

  let locationConfidence: LocationConfidence;
  if (!insideParcel && distanceToParcelMeters > loc.lowConfidenceMaxDistanceMeters) {
    locationConfidence = 'insufficient';
  } else if (
    !insideParcel &&
    distanceToParcelMeters > loc.mediumConfidenceMaxDistanceMeters
  ) {
    locationConfidence = 'low';
  } else if (
    !insideParcel &&
    distanceToParcelMeters > loc.highConfidenceMaxDistanceMeters
  ) {
    locationConfidence = 'medium';
  } else {
    locationConfidence = 'high';
  }

  if (
    accuracy != null &&
    Number.isFinite(accuracy) &&
    accuracy > loc.maximumAcceptedGpsAccuracyMeters
  ) {
    warnings.push(
      `GPS accuracy ${accuracy} m exceeds maximum accepted ${loc.maximumAcceptedGpsAccuracyMeters} m`,
    );
    if (locationConfidence === 'high') {
      locationConfidence = 'medium';
    } else if (locationConfidence === 'medium') {
      locationConfidence = 'low';
    }
  } else if (accuracy != null && accuracy > loc.highConfidenceMaxDistanceMeters) {
    if (locationConfidence === 'high') {
      locationConfidence = 'medium';
    }
  }

  let acceptance: SampleAcceptance;
  if (!insideParcel && distanceToParcelMeters > loc.lowConfidenceMaxDistanceMeters) {
    acceptance = 'invalid';
    warnings.push(
      `Sample is ${distanceToParcelMeters.toFixed(1)} m outside parcel (max ${loc.lowConfidenceMaxDistanceMeters} m)`,
    );
  } else if (!insideParcel) {
    acceptance = 'accepted_with_warning';
    warnings.push(
      `Sample is ${distanceToParcelMeters.toFixed(1)} m outside parcel boundary`,
    );
  } else if (warnings.length > 0) {
    acceptance = 'accepted_with_warning';
  } else {
    acceptance = 'accepted';
  }

  return {
    insideParcel,
    distanceToParcelMeters: Number(distanceToParcelMeters.toFixed(2)),
    locationConfidence,
    acceptance,
    warnings,
  };
}

export function distanceBetweenSamplesMeters(
  a: SampleLocation,
  b: SampleLocation,
): number {
  return turf.distance(
    turf.point([a.longitude, a.latitude]),
    turf.point([b.longitude, b.latitude]),
    { units: 'meters' },
  );
}
