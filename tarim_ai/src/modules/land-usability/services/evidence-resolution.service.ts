import type { TerrainProfileResponse } from '../../terrain/types/terrain.types.js';
import type { SoilProfile } from '../../environment/soil/types/soil.types.js';
import type { LandUsabilityCalibration } from '../constants/land-usability-calibration.js';
import type {
  EvidenceItem,
  FieldEvidenceInput,
  ModeledSoilDepthResult,
  NormalizedSurfaceEvidence,
  RootableSoilDepthResult,
  SourceComponentResolution,
  SourceType,
} from '../types/land-usability.types.js';
import { rockClassMeetsMinimum } from './surface-evidence-adapter.service.js';

export interface ResolvedEvidenceBundle {
  surface: NormalizedSurfaceEvidence | null;
  terrainReal: boolean;
  terrain: TerrainProfileResponse | null;
  soil: SoilProfile | null;
  soilRealModeled: boolean;
  soilMock: boolean;
  rootableSoilDepth: RootableSoilDepthResult;
  modeledSoilDepth: ModeledSoilDepthResult | null;
  fieldEvidence?: FieldEvidenceInput;
  supportingEvidence: EvidenceItem[];
  limitingFactors: EvidenceItem[];
  unknownFactors: EvidenceItem[];
  ignoredEvidence: EvidenceItem[];
  sourceResolution: Record<string, SourceComponentResolution>;
  realEvidenceCount: number;
  hardConstraints: EvidenceItem[];
}

export class EvidenceResolutionService {
  resolve(input: {
    surface: NormalizedSurfaceEvidence | null;
    terrain: TerrainProfileResponse | null;
    soil: SoilProfile | null;
    rootableSoilDepth: RootableSoilDepthResult;
    fieldEvidence?: FieldEvidenceInput;
    calibration: LandUsabilityCalibration;
  }): ResolvedEvidenceBundle {
    const {
      surface,
      terrain,
      soil,
      rootableSoilDepth,
      fieldEvidence,
      calibration,
    } = input;

    const supportingEvidence: EvidenceItem[] = [];
    const limitingFactors: EvidenceItem[] = [];
    const unknownFactors: EvidenceItem[] = [];
    const ignoredEvidence: EvidenceItem[] = [];
    const hardConstraints: EvidenceItem[] = [];
    const sourceResolution: Record<string, SourceComponentResolution> = {};

    let realEvidenceCount = 0;

    // --- Surface ---
    if (surface?.providerReal && surface.usableObservationCount > 0) {
      realEvidenceCount += 1;
      sourceResolution.surfaceActivity = {
        source: 'sentinel-2',
        sourceType: 'real_satellite',
        confidence: surface.dataConfidence,
      };
      sourceResolution.probableRockSignal = {
        source: 'sentinel-2',
        sourceType: 'real_satellite',
        confidence: surface.dataConfidence,
      };

      if (surface.agriculturalCycleDetected) {
        supportingEvidence.push({
          code: 'REPEATED_AGRICULTURAL_ACTIVITY_SIGNAL',
          severity: 'supporting',
          source: 'sentinel-2',
          confidence: 'medium',
          observedValue: surface.agriculturalCycleClassification,
        });
      }

      if (
        surface.probableRockClassification === 'low' ||
        (surface.probableRockScore != null && surface.probableRockScore < 40)
      ) {
        supportingEvidence.push({
          code: 'LOW_PROBABLE_ROCK_SIGNAL',
          severity: 'supporting',
          source: 'sentinel-2',
          confidence: surface.dataConfidence === 'high' ? 'high' : 'medium',
          observedValue: surface.probableRockScore,
        });
      }

      if (
        rockClassMeetsMinimum(
          surface.probableRockClassification,
          calibration.rockSignal.fieldVerificationMinimumClass,
        )
      ) {
        unknownFactors.push({
          code: 'PROBABLE_ROCK_NEEDS_FIELD_CONFIRMATION',
          severity: 'important',
          requiresFieldVerification: true,
          observedValue: surface.probableRockClassification,
          message:
            'Probable rock signal is elevated; field confirmation is required (not a hard constraint alone).',
        });
      }
    } else {
      sourceResolution.surfaceActivity = {
        source: 'unknown',
        sourceType: 'unknown',
        confidence: 'unknown',
      };
      unknownFactors.push({
        code: 'REAL_SURFACE_ANALYSIS_UNAVAILABLE',
        severity: 'important',
        requiresFieldVerification: false,
      });
    }

    // --- Terrain ---
    const terrainMock =
      !terrain ||
      terrain.metadata.isMock === true ||
      terrain.metadata.fallbackUsed === true ||
      String(terrain.metadata.provider ?? '').includes('mock');

    const coverageStatus = terrain?.terrain.coverage?.coverageStatus;
    const coverageSufficient =
      coverageStatus == null ||
      coverageStatus === 'complete' ||
      coverageStatus === 'adequate' ||
      coverageStatus === 'partial';
    const spatialOk =
      terrain != null &&
      (terrain.metadata.spatialConfidence === 'medium' ||
        terrain.metadata.spatialConfidence === 'high');
    const usedInDecisionFlag =
      terrain?.metadata.usedInDecision !== false &&
      !terrainMock &&
      spatialOk &&
      coverageSufficient;

    if (terrain && usedInDecisionFlag) {
      realEvidenceCount += 1;
      sourceResolution.terrain = {
        source: String(terrain.metadata.provider ?? 'copernicus-dem'),
        sourceType: 'real_dem',
        confidence: terrain.metadata.spatialConfidence,
      };

      const meanSlope = terrain.terrain.slope.meanPercent;
      const p90 = terrain.terrain.slope.p90Percent;
      const mech = terrain.terrain.mechanization.terrainSuitability;
      const rugged = terrain.terrain.ruggedness.classification;
      const providerName = String(terrain.metadata.provider);
      const coverageOkForLimiting =
        coverageStatus == null ||
        coverageStatus === 'complete' ||
        coverageStatus === 'adequate';

      supportingEvidence.push({
        code: 'REAL_TERRAIN_PROFILE_AVAILABLE',
        severity: 'supporting',
        source: providerName,
        confidence: terrain.metadata.spatialConfidence,
        observedValue: terrain.metadata.dataset ?? providerName,
      });

      const strongMean = meanSlope >= calibration.hardConstraints.strongSlopeMeanPercent;
      const strongP90 = p90 >= calibration.hardConstraints.strongSlopeP90Percent;
      // Max slope alone must not create a hard constraint.
      if (
        spatialOk &&
        coverageOkForLimiting &&
        (strongMean || strongP90 || mech === 'strongly_limited')
      ) {
        const matchedRule = strongMean
          ? 'MEAN_SLOPE'
          : strongP90
            ? 'P90_SLOPE'
            : 'MECHANIZATION_STRONGLY_LIMITED';
        hardConstraints.push({
          code: 'REAL_TERRAIN_STRONG_SLOPE_OR_MECHANIZATION',
          severity: 'high',
          source: providerName,
          confidence: terrain.metadata.spatialConfidence,
          observedValue: meanSlope,
          message: JSON.stringify({
            matchedRule,
            thresholdMean: calibration.hardConstraints.strongSlopeMeanPercent,
            thresholdP90: calibration.hardConstraints.strongSlopeP90Percent,
            observedMean: meanSlope,
            observedP90: p90,
            coverageStatus: coverageStatus ?? 'unknown',
            confidence: terrain.metadata.spatialConfidence,
          }),
        });
        limitingFactors.push({
          code: 'REAL_TERRAIN_STRONG_SLOPE_OR_MECHANIZATION',
          severity: 'high',
          source: providerName,
          observedValue: meanSlope,
        });
        if (strongMean || strongP90) {
          limitingFactors.push({
            code: 'STEEP_TERRAIN_CONFIRMED',
            severity: 'high',
            source: providerName,
            confidence: terrain.metadata.spatialConfidence,
            observedValue: meanSlope,
          });
        }
        if (strongP90) {
          limitingFactors.push({
            code: 'HIGH_P90_SLOPE',
            severity: 'important',
            source: providerName,
            observedValue: p90,
          });
        }
      } else if (
        spatialOk &&
        coverageOkForLimiting &&
        (mech === 'limited' || meanSlope >= 20)
      ) {
        limitingFactors.push({
          code: 'REAL_TERRAIN_LIMITED',
          severity: 'important',
          source: providerName,
          observedValue: meanSlope,
        });
        limitingFactors.push({
          code: 'TERRAIN_MECHANIZATION_LIMITED',
          severity: 'important',
          source: providerName,
          observedValue: mech,
        });
        if (meanSlope >= 20) {
          limitingFactors.push({
            code: 'STEEP_TERRAIN_CONFIRMED',
            severity: 'important',
            source: providerName,
            observedValue: meanSlope,
          });
        }
        if (p90 >= 30) {
          limitingFactors.push({
            code: 'HIGH_P90_SLOPE',
            severity: 'important',
            source: providerName,
            observedValue: p90,
          });
        }
      } else if (mech === 'suitable' || mech === 'partially_suitable') {
        supportingEvidence.push({
          code: 'REAL_TERRAIN_FAVORABLE',
          severity: 'supporting',
          source: providerName,
          confidence: terrain.metadata.spatialConfidence,
        });
        if (meanSlope < 12) {
          supportingEvidence.push({
            code: 'TERRAIN_SLOPE_GENERALLY_FAVORABLE',
            severity: 'supporting',
            source: providerName,
            confidence: terrain.metadata.spatialConfidence,
            observedValue: meanSlope,
          });
        }
        if (mech === 'suitable' || mech === 'partially_suitable') {
          supportingEvidence.push({
            code: 'TERRAIN_MECHANIZATION_GENERALLY_SUITABLE',
            severity: 'supporting',
            source: providerName,
            confidence: terrain.metadata.spatialConfidence,
            observedValue: mech,
          });
        }
      }

      if (rugged === 'very_low' || rugged === 'low') {
        supportingEvidence.push({
          code: 'LOW_TERRAIN_RUGGEDNESS',
          severity: 'supporting',
          source: providerName,
          confidence: terrain.metadata.spatialConfidence,
          observedValue: rugged,
        });
      } else if (
        spatialOk &&
        coverageOkForLimiting &&
        (rugged === 'high' || rugged === 'very_high')
      ) {
        limitingFactors.push({
          code: 'HIGH_TERRAIN_RUGGEDNESS',
          severity: 'important',
          source: providerName,
          observedValue: rugged,
        });
      }

      if (coverageStatus === 'partial') {
        unknownFactors.push({
          code: 'TERRAIN_RESOLUTION_LIMITED',
          severity: 'important',
          requiresFieldVerification: false,
          observedValue: coverageStatus,
        });
      }

      // Field-verified machine access vs terrain mechanization (no silent override)
      const fieldAccess = fieldEvidence?.machineAccess;
      const terrainMechLimited =
        mech === 'limited' || mech === 'strongly_limited';
      const fieldAccessible = fieldAccess === 'verified';
      if (terrainMechLimited && fieldAccessible) {
        unknownFactors.push({
          code: 'TERRAIN_FIELD_MECHANIZATION_CONTRADICTION',
          severity: 'important',
          requiresFieldVerification: true,
          message:
            'Terrain mechanization limited iken saha machine access verified; sessiz override yok.',
          observedValue: `${mech}|${fieldAccess}`,
        });
      }
    } else {
      sourceResolution.terrain = {
        source: terrain ? String(terrain.metadata.provider ?? 'mock') : 'unavailable',
        sourceType: terrain ? 'mock' : 'unknown',
        confidence: 'unusable_for_real_decision',
      };
      if (terrain) {
        ignoredEvidence.push({
          code: 'MOCK_TERRAIN_NOT_USED',
          reason: 'Mock DEM cannot support a real parcel suitability decision.',
        });
      }
      if (
        terrain &&
        !terrainMock &&
        (coverageStatus === 'insufficient' || !spatialOk)
      ) {
        unknownFactors.push({
          code: 'TERRAIN_COVERAGE_INSUFFICIENT',
          severity: 'important',
          requiresFieldVerification: false,
          observedValue: coverageStatus ?? terrain.metadata.spatialConfidence,
        });
      }
      unknownFactors.push({
        code: 'REAL_TERRAIN_PROFILE_UNAVAILABLE',
        severity: 'important',
        requiresFieldVerification: false,
      });
    }

    const terrainReal = Boolean(terrain && usedInDecisionFlag);

    // --- Soil ---
    let soilMock = true;
    let soilRealModeled = false;
    let modeledSoilDepth: ModeledSoilDepthResult | null = null;

    if (soil) {
      soilMock = soil.metadata.isMock === true || soil.provider === 'mock';
      const provider = String(soil.provider ?? soil.metadata.provider ?? 'unknown');
      if (!soilMock) {
        soilRealModeled = provider === 'soilgrids' || soil.metadata.isEstimated === true;
        sourceResolution.soil = {
          source: provider,
          sourceType: soilRealModeled ? 'global_modeled_provider' : 'laboratory_analysis',
          confidence: soilRealModeled ? 'low' : 'medium',
        };
        if (soilRealModeled) {
          realEvidenceCount += 1; // modeled real provider counts as a real source of low confidence
          supportingEvidence.push({
            code: 'MODELED_SOIL_PROFILE_AVAILABLE',
            severity: 'supporting',
            source: provider,
            confidence: 'low',
          });
          const sampled =
            typeof soil.metadata.sampledDepthCm === 'number'
              ? soil.metadata.sampledDepthCm
              : null;
          modeledSoilDepth = {
            valueCm: sampled,
            source: 'global_model',
            confidence: 'low',
            usableAsVerifiedRootableDepth: false,
          };
        } else {
          realEvidenceCount += 1;
        }
      } else {
        sourceResolution.soil = {
          source: 'mock',
          sourceType: 'mock',
          confidence: 'unusable_for_real_decision',
        };
        ignoredEvidence.push({
          code: 'MOCK_SOIL_NOT_USED',
          reason: 'Mock soil cannot support a real parcel suitability decision.',
        });
      }
    } else {
      sourceResolution.soil = {
        source: 'unknown',
        sourceType: 'unknown',
        confidence: 'unknown',
      };
    }

    // --- Rootable depth ---
    if (rootableSoilDepth.status === 'field_measured') {
      realEvidenceCount += 1;
      sourceResolution.soilDepth = {
        source: 'field_measurement',
        sourceType: 'field_measurement',
        confidence: rootableSoilDepth.confidence,
      };
      supportingEvidence.push({
        code: 'FIELD_VERIFIED_ROOTABLE_DEPTH',
        severity: 'supporting',
        source: 'field_measurement',
        confidence: rootableSoilDepth.confidence,
        observedValue: rootableSoilDepth.meanCm,
        message: 'Köklenebilir derinlik saha ölçümü ile doğrulanmıştır.',
      });
      if (
        rootableSoilDepth.meanCm != null &&
        rootableSoilDepth.meanCm < calibration.hardConstraints.veryShallowMeanDepthCm &&
        (rootableSoilDepth.confidence === 'medium' ||
          rootableSoilDepth.confidence === 'high')
      ) {
        hardConstraints.push({
          code: 'VERIFIED_VERY_SHALLOW_ROOTABLE_DEPTH',
          severity: 'critical',
          source: 'field_measurement',
          confidence: rootableSoilDepth.confidence,
          observedValue: rootableSoilDepth.meanCm,
        });
        limitingFactors.push({
          code: 'VERIFIED_VERY_SHALLOW_ROOTABLE_DEPTH',
          severity: 'critical',
          source: 'field_measurement',
          observedValue: rootableSoilDepth.meanCm,
        });
      }
    } else {
      sourceResolution.soilDepth = {
        source: 'unknown',
        sourceType: 'unknown',
        confidence: 'unknown',
      };
      unknownFactors.push({
        code: 'ROOTABLE_SOIL_DEPTH_UNKNOWN',
        severity: 'important',
        requiresFieldVerification: true,
      });
    }

    // --- Field evidence hard constraints / supporting observations ---
    if (
      fieldEvidence?.surfaceStoniness &&
      fieldEvidence.surfaceStoniness !== 'unknown'
    ) {
      supportingEvidence.push({
        code: 'FIELD_VERIFIED_SURFACE_STONINESS',
        severity: 'supporting',
        source: 'field_measurement',
        confidence: 'medium',
        observedValue: fieldEvidence.surfaceStoniness,
      });
    }

    if (
      fieldEvidence?.bedrockOutcrop &&
      fieldEvidence.bedrockOutcrop !== 'unknown' &&
      fieldEvidence.bedrockOutcrop !== 'extensive'
    ) {
      // Keep satellite probable-rock as a separate signal; do not erase it.
      supportingEvidence.push({
        code: 'FIELD_VERIFIED_BEDROCK_OBSERVATION',
        severity: 'supporting',
        source: 'field_measurement',
        confidence: 'medium',
        observedValue: fieldEvidence.bedrockOutcrop,
        message:
          'Saha kaya çıkışı gözlemi; uydu probable rock sinyalinden bağımsız kanıttır.',
      });
    }

    if (fieldEvidence?.bedrockOutcrop === 'extensive') {
      hardConstraints.push({
        code: 'HIGH_VERIFIED_ROCK_OUTCROP',
        severity: 'high',
        source: 'field_measurement',
        confidence: 'high',
        observedValue: 'extensive',
      });
      limitingFactors.push({
        code: 'HIGH_VERIFIED_ROCK_OUTCROP',
        severity: 'high',
        source: 'field_measurement',
        observedValue: 'extensive',
      });
    }

    if (
      fieldEvidence?.machineAccess &&
      fieldEvidence.machineAccess !== 'unknown' &&
      fieldEvidence.machineAccess !== 'impossible'
    ) {
      supportingEvidence.push({
        code: 'FIELD_VERIFIED_MACHINE_ACCESS',
        severity: 'supporting',
        source: 'field_measurement',
        confidence: 'medium',
        observedValue: fieldEvidence.machineAccess,
      });
    }

    if (fieldEvidence?.machineAccess === 'impossible') {
      hardConstraints.push({
        code: 'VERIFIED_MACHINE_ACCESS_IMPOSSIBLE',
        severity: 'high',
        source: 'field_measurement',
        confidence: 'high',
      });
      limitingFactors.push({
        code: 'VERIFIED_MACHINE_ACCESS_IMPOSSIBLE',
        severity: 'high',
        source: 'field_measurement',
      });
    }

    if (
      fieldEvidence?.drainageObservation &&
      fieldEvidence.drainageObservation !== 'unknown' &&
      fieldEvidence.drainageObservation !== 'poor' &&
      fieldEvidence.drainageObservation !== 'waterlogging_observed'
    ) {
      supportingEvidence.push({
        code: 'FIELD_VERIFIED_DRAINAGE_OBSERVATION',
        severity: 'supporting',
        source: 'field_measurement',
        confidence: 'medium',
        observedValue: fieldEvidence.drainageObservation,
      });
    }

    if (
      fieldEvidence?.drainageObservation === 'poor' ||
      fieldEvidence?.drainageObservation === 'waterlogging_observed'
    ) {
      limitingFactors.push({
        code: 'FIELD_DRAINAGE_LIMITED',
        severity: 'important',
        source: 'field_measurement',
        confidence: 'medium',
        observedValue: fieldEvidence.drainageObservation,
      });
    }

    if (!fieldEvidence?.surfaceStoniness || fieldEvidence.surfaceStoniness === 'unknown') {
      unknownFactors.push({
        code: 'FIELD_STONINESS_UNKNOWN',
        severity: 'important',
        requiresFieldVerification: true,
      });
    } else if (fieldEvidence.surfaceStoniness === 'high') {
      limitingFactors.push({
        code: 'FIELD_SURFACE_STONINESS_HIGH',
        severity: 'important',
        source: 'field_measurement',
        confidence: 'medium',
        observedValue: fieldEvidence.surfaceStoniness,
      });
    }

    return {
      surface,
      terrainReal,
      terrain,
      soil,
      soilRealModeled,
      soilMock,
      rootableSoilDepth,
      modeledSoilDepth,
      fieldEvidence,
      supportingEvidence: dedupeEvidence(supportingEvidence),
      limitingFactors: dedupeEvidence(limitingFactors),
      unknownFactors: dedupeEvidence(unknownFactors),
      ignoredEvidence: dedupeEvidence(ignoredEvidence),
      sourceResolution,
      realEvidenceCount,
      hardConstraints: dedupeEvidence(hardConstraints),
    };
  }
}

function dedupeEvidence(items: EvidenceItem[]): EvidenceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.code)) return false;
    seen.add(item.code);
    return true;
  });
}

export function sourceTypePriority(type: SourceType): number {
  const order: SourceType[] = [
    'field_measurement',
    'laboratory_analysis',
    'official_local_dataset',
    'real_satellite',
    'real_dem',
    'global_modeled',
    'global_modeled_provider',
    'mock',
    'unknown',
  ];
  return order.indexOf(type);
}
