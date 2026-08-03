import type { LandUsabilityCalibration } from '../constants/land-usability-calibration.js';
import type {
  LandUsabilityConfidence,
  LandUsabilityDecision,
  LandUsabilityStatus,
  PhysicalSuitabilityResult,
} from '../types/land-usability.types.js';
import type { ResolvedEvidenceBundle } from './evidence-resolution.service.js';
import { rockClassMeetsMinimum, rockRank } from './surface-evidence-adapter.service.js';

export interface DecisionOutcome {
  decision: LandUsabilityDecision;
  matchedRule: {
    code: string;
    inputs: Record<string, unknown>;
    result: string;
  };
  evaluatedRules: string[];
  rejectedRules: string[];
}

export class PhysicalSuitabilityService {
  decide(
    bundle: ResolvedEvidenceBundle,
    calibration: LandUsabilityCalibration,
  ): DecisionOutcome {
    const evaluatedRules: string[] = [];
    const rejectedRules: string[] = [];

    const surfaceOk =
      bundle.surface?.providerReal === true &&
      (bundle.surface.usableObservationCount ?? 0) >= 3 &&
      bundle.surface.dataConfidence !== 'low';

    const surfaceStrong =
      surfaceOk &&
      bundle.surface!.dataConfidence === 'high' &&
      (bundle.surface!.seasonsRepresented ?? 0) >= 3;

    const rockClass = bundle.surface?.probableRockClassification ?? null;
    const rockElevated = rockClassMeetsMinimum(
      rockClass,
      calibration.rockSignal.fieldVerificationMinimumClass,
    );
    const rockLowOrMedium = rockRank(rockClass) > 0 && rockRank(rockClass) <= 2;

    const cycleOk = bundle.surface?.agriculturalCycleDetected === true;
    const cycleWeakBare =
      bundle.surface != null &&
      !cycleOk &&
      (bundle.surface.lowNdviShare ?? 0) >= 0.55;

    const depthVerified = bundle.rootableSoilDepth.status === 'field_measured';
    const criticalUnknowns = bundle.unknownFactors.filter(
      (u) =>
        u.code === 'ROOTABLE_SOIL_DEPTH_UNKNOWN' ||
        u.code === 'REAL_TERRAIN_PROFILE_UNAVAILABLE' ||
        u.code === 'PROBABLE_ROCK_NEEDS_FIELD_CONFIRMATION' ||
        u.code === 'TERRAIN_FIELD_MECHANIZATION_CONTRADICTION',
    );

    const verifiedHard =
      bundle.hardConstraints.length > 0 &&
      bundle.hardConstraints.every(
        (c) => c.confidence === 'medium' || c.confidence === 'high' || !c.confidence,
      );

    const terrainLimited = bundle.limitingFactors.some(
      (f) =>
        f.code === 'REAL_TERRAIN_LIMITED' ||
        f.code === 'TERRAIN_MECHANIZATION_LIMITED' ||
        f.code === 'STEEP_TERRAIN_CONFIRMED' ||
        f.code === 'HIGH_TERRAIN_RUGGEDNESS',
    );
    const mechanizationContradiction = bundle.unknownFactors.some(
      (u) => u.code === 'TERRAIN_FIELD_MECHANIZATION_CONTRADICTION',
    );

    const inputs = {
      surfaceProviderReal: bundle.surface?.providerReal ?? false,
      surfaceOk,
      surfaceStrong,
      probableRockClass: rockClass,
      agriculturalCycle: bundle.surface?.agriculturalCycleClassification ?? null,
      rootableDepthStatus: bundle.rootableSoilDepth.status,
      realTerrainAvailable: bundle.terrainReal,
      realEvidenceCount: bundle.realEvidenceCount,
      hardConstraintCount: bundle.hardConstraints.length,
      soilMock: bundle.soilMock,
      depthVerified,
      terrainLimited,
      mechanizationContradiction,
    };

    // 1. Strong physical constraints (verified only)
    evaluatedRules.push('STRONG_VERIFIED_HARD_CONSTRAINT');
    if (bundle.hardConstraints.length > 0 && verifiedHard) {
      const physical = this.buildPhysical(bundle, 'strongly_limited', 'medium', [
        'VERIFIED_HARD_CONSTRAINT',
      ]);
      return finish(
        'strong_physical_constraints',
        physical,
        this.confidence(bundle, calibration, criticalUnknowns.length),
        {
          code: 'STRONG_VERIFIED_HARD_CONSTRAINT',
          inputs,
          result: 'strong_physical_constraints',
        },
        evaluatedRules,
        rejectedRules,
      );
    }
    rejectedRules.push('STRONG_VERIFIED_HARD_CONSTRAINT');

    // 2. Insufficient data
    evaluatedRules.push('INSUFFICIENT_REAL_EVIDENCE');
    const insufficient =
      !surfaceOk &&
      !bundle.terrainReal &&
      bundle.soilMock &&
      !depthVerified &&
      bundle.realEvidenceCount < calibration.minimumRealEvidenceCount;
    if (insufficient) {
      const physical = this.buildPhysical(bundle, 'insufficient_data', 'insufficient', []);
      return finish(
        'insufficient_data',
        physical,
        'insufficient',
        {
          code: 'INSUFFICIENT_REAL_EVIDENCE',
          inputs,
          result: 'insufficient_data',
        },
        evaluatedRules,
        rejectedRules,
      );
    }
    rejectedRules.push('INSUFFICIENT_REAL_EVIDENCE');

    // 3. Field verification required
    evaluatedRules.push('FIELD_VERIFICATION_ELEVATED_UNCERTAINTY');
    const needsField =
      rockElevated ||
      bundle.limitingFactors.some((f) => f.code === 'REAL_TERRAIN_LIMITED') ||
      cycleWeakBare ||
      (bundle.fieldEvidence?.bedrockOutcrop === 'sparse' &&
        rockRank(rockClass) >= 2);
    if (needsField) {
      const physical = this.buildPhysical(
        bundle,
        rockElevated || cycleWeakBare ? 'uncertain' : 'limited',
        'low',
        cycleOk ? ['REPEATED_AGRICULTURAL_ACTIVITY_SIGNAL'] : [],
      );
      return finish(
        'field_verification_required',
        physical,
        this.confidence(bundle, calibration, criticalUnknowns.length),
        {
          code: 'FIELD_VERIFICATION_ELEVATED_UNCERTAINTY',
          inputs,
          result: 'field_verification_required',
        },
        evaluatedRules,
        rejectedRules,
      );
    }
    rejectedRules.push('FIELD_VERIFICATION_ELEVATED_UNCERTAINTY');

    // 4. Suitable for preliminary (strict) — requires validated calibration
    evaluatedRules.push('PRELIMINARY_SUITABLE_STRICT');
    const suitable =
      surfaceStrong &&
      bundle.terrainReal &&
      rockLowOrMedium &&
      rockRank(rockClass) === 1 &&
      cycleOk &&
      depthVerified &&
      criticalUnknowns.length === 0 &&
      bundle.hardConstraints.length === 0 &&
      !terrainLimited &&
      !mechanizationContradiction &&
      calibration.validationStatus !== 'unvalidated';
    if (suitable) {
      const physical = this.buildPhysical(bundle, 'favorable', 'high', [
        'REAL_SENTINEL_ACTIVITY_SIGNAL',
        'LOW_PROBABLE_ROCK_SIGNAL',
        'REAL_TERRAIN_FAVORABLE',
        'VERIFIED_ROOTABLE_DEPTH',
      ]);
      return finish(
        'suitable_for_preliminary_recommendation',
        physical,
        this.confidence(bundle, calibration, 0),
        {
          code: 'PRELIMINARY_SUITABLE_STRICT',
          inputs,
          result: 'suitable_for_preliminary_recommendation',
        },
        evaluatedRules,
        rejectedRules,
      );
    }
    rejectedRules.push('PRELIMINARY_SUITABLE_STRICT');

    const baseCautionOk =
      surfaceOk &&
      rockLowOrMedium &&
      cycleOk &&
      bundle.hardConstraints.length === 0 &&
      !rockElevated;

    // 5a. Real surface + verified field + real terrain
    evaluatedRules.push('CAUTION_REAL_SURFACE_LOW_ROCK_VERIFIED_FIELD_AND_REAL_TERRAIN');
    if (baseCautionOk && depthVerified && bundle.terrainReal) {
      const classification = mechanizationContradiction
        ? 'uncertain'
        : terrainLimited
          ? 'limited'
          : 'generally_favorable';
      const physical = this.buildPhysical(bundle, classification, 'medium', [
        'REAL_SENTINEL_ACTIVITY_SIGNAL',
        'LOW_PROBABLE_ROCK_SIGNAL',
        'AGRICULTURAL_CYCLE_DETECTED',
        'VERIFIED_ROOTABLE_DEPTH',
        'REAL_TERRAIN_PROFILE_AVAILABLE',
      ]);
      return finish(
        'recommendation_with_caution',
        physical,
        this.confidence(bundle, calibration, criticalUnknowns.length),
        {
          code: 'CAUTION_REAL_SURFACE_LOW_ROCK_VERIFIED_FIELD_AND_REAL_TERRAIN',
          inputs,
          result: 'recommendation_with_caution',
        },
        evaluatedRules,
        rejectedRules,
      );
    }
    rejectedRules.push('CAUTION_REAL_SURFACE_LOW_ROCK_VERIFIED_FIELD_AND_REAL_TERRAIN');

    // 5b. Real surface + verified field + no real terrain
    evaluatedRules.push(
      'CAUTION_REAL_SURFACE_LOW_ROCK_VERIFIED_FIELD_EVIDENCE_NO_REAL_TERRAIN',
    );
    if (baseCautionOk && depthVerified && !bundle.terrainReal) {
      const physical = this.buildPhysical(bundle, 'generally_favorable', 'medium', [
        'REAL_SENTINEL_ACTIVITY_SIGNAL',
        'LOW_PROBABLE_ROCK_SIGNAL',
        'AGRICULTURAL_CYCLE_DETECTED',
        'VERIFIED_ROOTABLE_DEPTH',
      ]);
      return finish(
        'recommendation_with_caution',
        physical,
        this.confidence(bundle, calibration, criticalUnknowns.length),
        {
          code: 'CAUTION_REAL_SURFACE_LOW_ROCK_VERIFIED_FIELD_EVIDENCE_NO_REAL_TERRAIN',
          inputs,
          result: 'recommendation_with_caution',
        },
        evaluatedRules,
        rejectedRules,
      );
    }
    rejectedRules.push(
      'CAUTION_REAL_SURFACE_LOW_ROCK_VERIFIED_FIELD_EVIDENCE_NO_REAL_TERRAIN',
    );

    // 5c. Legacy: unknown depth (must not match when depth is verified)
    evaluatedRules.push('CAUTION_REAL_SURFACE_LOW_ROCK_UNKNOWN_DEPTH');
    if (baseCautionOk && !depthVerified) {
      const physical = this.buildPhysical(bundle, 'generally_favorable', 'medium', [
        'REAL_SENTINEL_ACTIVITY_SIGNAL',
        'LOW_PROBABLE_ROCK_SIGNAL',
        ...(cycleOk ? ['AGRICULTURAL_CYCLE_DETECTED'] : []),
      ]);
      return finish(
        'recommendation_with_caution',
        physical,
        this.confidence(bundle, calibration, criticalUnknowns.length),
        {
          code: 'CAUTION_REAL_SURFACE_LOW_ROCK_UNKNOWN_DEPTH',
          inputs,
          result: 'recommendation_with_caution',
        },
        evaluatedRules,
        rejectedRules,
      );
    }
    rejectedRules.push('CAUTION_REAL_SURFACE_LOW_ROCK_UNKNOWN_DEPTH');

    // Fallback caution / uncertain
    evaluatedRules.push('FALLBACK_CAUTION_OR_UNCERTAIN');
    if (surfaceOk) {
      const physical = this.buildPhysical(bundle, 'uncertain', 'low', [
        'REAL_SURFACE_PARTIAL',
      ]);
      return finish(
        'recommendation_with_caution',
        physical,
        this.confidence(bundle, calibration, criticalUnknowns.length),
        {
          code: 'FALLBACK_CAUTION_OR_UNCERTAIN',
          inputs,
          result: 'recommendation_with_caution',
        },
        evaluatedRules,
        rejectedRules,
      );
    }
    rejectedRules.push('FALLBACK_CAUTION_OR_UNCERTAIN');

    // Verified field evidence can support caution even without surface/terrain
    evaluatedRules.push('CAUTION_VERIFIED_FIELD_EVIDENCE');
    if (depthVerified && bundle.hardConstraints.length === 0) {
      const physical = this.buildPhysical(
        bundle,
        'generally_favorable',
        'medium',
        ['VERIFIED_ROOTABLE_DEPTH', 'FIELD_SURVEY_APPROVED'],
      );
      return finish(
        'recommendation_with_caution',
        physical,
        this.confidence(bundle, calibration, criticalUnknowns.length),
        {
          code: 'CAUTION_VERIFIED_FIELD_EVIDENCE',
          inputs,
          result: 'recommendation_with_caution',
        },
        evaluatedRules,
        rejectedRules,
      );
    }
    rejectedRules.push('CAUTION_VERIFIED_FIELD_EVIDENCE');

    // Real DEM/terrain alone is enough for a preliminary caution decision when
    // surface time-series / field survey are unavailable (common in orchestrator).
    evaluatedRules.push('CAUTION_REAL_TERRAIN_WITHOUT_SURFACE_OR_FIELD');
    if (bundle.terrainReal && bundle.hardConstraints.length === 0) {
      const classification = terrainLimited
        ? 'limited'
        : mechanizationContradiction
          ? 'uncertain'
          : 'generally_favorable';
      const physical = this.buildPhysical(bundle, classification, 'low', [
        'REAL_TERRAIN_PROFILE_AVAILABLE',
        ...(terrainLimited ? [] : ['REAL_TERRAIN_FAVORABLE']),
        ...(bundle.soilMock === false ? ['MODELED_SOIL_PROFILE_AVAILABLE'] : []),
      ]);
      return finish(
        'recommendation_with_caution',
        physical,
        this.confidence(bundle, calibration, criticalUnknowns.length),
        {
          code: 'CAUTION_REAL_TERRAIN_WITHOUT_SURFACE_OR_FIELD',
          inputs,
          result: 'recommendation_with_caution',
        },
        evaluatedRules,
        rejectedRules,
      );
    }
    rejectedRules.push('CAUTION_REAL_TERRAIN_WITHOUT_SURFACE_OR_FIELD');

    const physical = this.buildPhysical(bundle, 'insufficient_data', 'insufficient', []);
    return finish(
      'insufficient_data',
      physical,
      'insufficient',
      {
        code: 'FALLBACK_INSUFFICIENT',
        inputs,
        result: 'insufficient_data',
      },
      evaluatedRules,
      rejectedRules,
    );
  }

  private buildPhysical(
    bundle: ResolvedEvidenceBundle,
    classification: PhysicalSuitabilityResult['classification'],
    confidence: LandUsabilityConfidence,
    basis: string[],
  ): PhysicalSuitabilityResult {
    const unknowns: string[] = [];
    if (bundle.rootableSoilDepth.status === 'unknown') {
      unknowns.push('ROOTABLE_SOIL_DEPTH');
    }
    if (!bundle.terrainReal) {
      unknowns.push('REAL_TERRAIN_PROFILE');
    }
    if (
      bundle.unknownFactors.some((u) => u.code === 'FIELD_STONINESS_UNKNOWN')
    ) {
      unknowns.push('FIELD_STONINESS');
    }
    return { classification, confidence, basis, unknowns };
  }

  private confidence(
    bundle: ResolvedEvidenceBundle,
    calibration: LandUsabilityCalibration,
    criticalUnknownCount: number,
  ): LandUsabilityConfidence {
    const depthVerified = bundle.rootableSoilDepth.status === 'field_measured';
    const surfaceReal = bundle.surface?.providerReal === true;
    const surfaceHigh = bundle.surface?.dataConfidence === 'high';

    if (
      surfaceReal &&
      surfaceHigh &&
      bundle.terrainReal &&
      depthVerified &&
      criticalUnknownCount === 0 &&
      calibration.confidence.highRequiresRealTerrain &&
      calibration.confidence.highRequiresVerifiedDepth
    ) {
      // Unvalidated calibration must not silently claim high confidence.
      if (calibration.validationStatus === 'unvalidated') {
        return 'medium';
      }
      return 'high';
    }

    if (
      surfaceReal &&
      bundle.realEvidenceCount >= calibration.confidence.mediumMinimumRealSources &&
      !bundle.hardConstraints.length
    ) {
      return 'medium';
    }

    if (
      depthVerified &&
      bundle.realEvidenceCount >= calibration.confidence.lowMinimumRealSources &&
      !bundle.hardConstraints.length
    ) {
      return 'medium';
    }

    if (bundle.realEvidenceCount >= calibration.confidence.lowMinimumRealSources) {
      return 'low';
    }

    return 'insufficient';
  }
}

function finish(
  status: LandUsabilityStatus,
  physical: PhysicalSuitabilityResult,
  confidence: LandUsabilityConfidence,
  matchedRule: DecisionOutcome['matchedRule'],
  evaluatedRules: string[],
  rejectedRules: string[],
): DecisionOutcome {
  return {
    decision: {
      status,
      physicalSuitability: physical,
      confidence,
      recommendationsArePreliminary: true,
    },
    matchedRule,
    evaluatedRules,
    rejectedRules,
  };
}
