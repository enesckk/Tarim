import type { CropPhysicalCompatibilityCalibration } from '../constants/crop-physical-compatibility-calibration.js';
import type {
  CompatibilityComponentResult,
  CompatibilityConfidence,
  OverallCompatibilityClassification,
  ParcelPhysicalEvidence,
} from '../types/crop-physical-compatibility.types.js';

export class CompatibilityConfidenceService {
  resolve(input: {
    components: CompatibilityComponentResult[];
    evidence: ParcelPhysicalEvidence;
    calibration: CropPhysicalCompatibilityCalibration;
    requirementsComplete: boolean;
    requirementsValidated: boolean;
    hasConflict: boolean;
  }): CompatibilityConfidence {
    const {
      components,
      evidence,
      calibration,
      requirementsComplete,
      requirementsValidated,
      hasConflict,
    } = input;

    const reliable = components.filter(
      (c) =>
        c.classification !== 'unknown' &&
        c.sourceType !== 'mock' &&
        c.confidence !== 'unusable_for_real_decision' &&
        c.confidence !== 'unknown',
    ).length;

    const criticalUnknown = components.filter(
      (c) =>
        (c.importance === 'critical' || c.importance === 'high') &&
        c.classification === 'unknown',
    ).length;

    const depthVerified = evidence.field?.rootableSoilDepth?.verified === true;
    const conf = calibration.confidence;

    if (
      reliable >= conf.mediumMinimumReliableComponents &&
      depthVerified &&
      evidence.terrainReal &&
      !evidence.terrainMock &&
      requirementsComplete &&
      criticalUnknown === 0 &&
      !hasConflict &&
      conf.highRequiresVerifiedFieldDepth &&
      conf.highRequiresRealTerrain &&
      conf.highRequiresCompleteCriticalRequirements &&
      requirementsValidated &&
      calibration.validationStatus === 'validated'
    ) {
      return 'high';
    }

    // Unvalidated calibration / requirements cannot claim high
    if (
      reliable >= conf.mediumMinimumReliableComponents &&
      (depthVerified || evidence.terrainReal) &&
      !hasConflict
    ) {
      return 'medium';
    }

    if (reliable >= conf.lowMinimumReliableComponents) {
      return 'low';
    }

    return 'insufficient';
  }
}

export class OverallClassificationService {
  classify(input: {
    components: CompatibilityComponentResult[];
    confidence: CompatibilityConfidence;
    calibration: CropPhysicalCompatibilityCalibration;
    requirementsComplete: boolean;
    requirementsValidated: boolean;
  }): {
    classification: OverallCompatibilityClassification;
    matchedRule: string;
    evaluatedRules: string[];
  } {
    const { components, confidence, calibration, requirementsComplete, requirementsValidated } =
      input;
    const evaluatedRules: string[] = [];

    const highLimited = components.filter(
      (c) =>
        c.classification === 'strongly_limited' &&
        (c.importance === 'high' || c.importance === 'critical') &&
        (c.sourceType === 'field_measurement' || c.sourceType === 'real_dem') &&
        (c.confidence === 'medium' || c.confidence === 'high'),
    );
    evaluatedRules.push('STRONG_LIMITED_VERIFIED_HIGH_COMPONENT');
    if (
      highLimited.length >=
      calibration.classification.stronglyLimitedMinimumHighComponents
    ) {
      return {
        classification: 'strongly_limited',
        matchedRule: 'STRONG_LIMITED_VERIFIED_HIGH_COMPONENT',
        evaluatedRules,
      };
    }

    const limitedHigh = components.filter(
      (c) =>
        c.classification === 'limited' &&
        (c.importance === 'high' || c.importance === 'critical'),
    );
    const limitedMedium = components.filter(
      (c) => c.classification === 'limited' && c.importance === 'medium',
    );
    evaluatedRules.push('PHYSICALLY_LIMITED_COMPONENTS');
    if (
      limitedHigh.length >= 1 ||
      limitedMedium.length >=
        calibration.classification.physicallyLimitedMinimumMediumComponents
    ) {
      return {
        classification: 'physically_limited',
        matchedRule: 'PHYSICALLY_LIMITED_COMPONENTS',
        evaluatedRules,
      };
    }

    const criticalUnknown = components.filter(
      (c) =>
        (c.importance === 'high' || c.importance === 'critical') &&
        c.classification === 'unknown',
    );
    const cautionComponents = components.filter(
      (c) => c.classification === 'caution',
    );

    evaluatedRules.push('INSUFFICIENT_CRITICAL_DATA');
    if (!requirementsComplete || criticalUnknown.length >= 3) {
      return {
        classification: 'insufficient_data',
        matchedRule: 'INSUFFICIENT_CRITICAL_DATA',
        evaluatedRules,
      };
    }

    evaluatedRules.push('COMPATIBLE_WITH_CAUTION');
    if (
      cautionComponents.length >= 1 ||
      (calibration.classification.criticalUnknownProducesCaution &&
        criticalUnknown.length >= 1)
    ) {
      return {
        classification: 'compatible_with_caution',
        matchedRule: 'COMPATIBLE_WITH_CAUTION',
        evaluatedRules,
      };
    }

    evaluatedRules.push('HIGHLY_COMPATIBLE');
    const allPreferred = components
      .filter((c) => c.importance === 'high' || c.importance === 'critical')
      .every(
        (c) => c.classification === 'preferred' || c.classification === 'acceptable',
      );
    const preferredOnly = components
      .filter((c) => c.importance === 'high' || c.importance === 'critical')
      .every((c) => c.classification === 'preferred');

    if (
      preferredOnly &&
      confidence === 'high' &&
      requirementsValidated &&
      calibration.validationStatus === 'validated'
    ) {
      return {
        classification: 'highly_compatible',
        matchedRule: 'HIGHLY_COMPATIBLE',
        evaluatedRules,
      };
    }

    evaluatedRules.push('COMPATIBLE');
    if (
      allPreferred &&
      criticalUnknown.length === 0 &&
      cautionComponents.length === 0
    ) {
      return {
        classification: 'compatible',
        matchedRule: 'COMPATIBLE',
        evaluatedRules,
      };
    }

    return {
      classification: 'compatible_with_caution',
      matchedRule: 'FALLBACK_CAUTION',
      evaluatedRules,
    };
  }
}
