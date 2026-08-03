import type { GeoJsonInput } from '../../../types/geojson.types.js';
import { ApiError } from '../../../utils/api-error.js';
import type { ParcelQueryService } from '../../parcel/services/parcel-query.service.js';
import type { ParcelQuery } from '../../parcel/types/parcel.types.js';
import type { TerrainProfileService } from '../../terrain/services/terrain-profile.service.js';
import type { FieldSurveyService } from '../../field-survey/services/field-survey.service.js';
import type { LandUsabilityService } from '../../land-usability/services/land-usability.service.js';
import type { CropKnowledgeService } from '../../crop-recommendation/services/crop-knowledge.service.js';
import type { CropRecommendationService } from '../../crop-recommendation/services/crop-recommendation.service.js';
import { ScoreCalibrationService } from '../../crop-recommendation/calibration/score-calibration.service.js';
import type { CalibrationManagementService } from '../../calibration-management/services/calibration-management.service.js';
import { selectCropsForReport } from '../../crop-recommendation/reporting/crop-report-selection.js';
import {
  CropPhysicalCompatibilityEngine,
  resolveCropPhysicalCompatibilityCalibration,
} from './crop-physical-compatibility.engine.js';
import type {
  CropPhysicalCompatibilityCheck,
  CropPhysicalCompatibilityResult,
  CropPhysicalCompatibilitySummary,
  ParcelPhysicalEvidence,
  RequirementResolutionMeta,
} from '../types/crop-physical-compatibility.types.js';
import { getEnv } from '../../../config/env.js';
import type { CropKnowledge } from '../../crop-recommendation/knowledge/schemas/crop-knowledge.schema.js';

export interface CropPhysicalCompatibilityAnalyzeRequest {
  geometry?: GeoJsonInput;
  parcelQuery?: ParcelQuery;
  fieldSurveyId?: string;
  useLatestApprovedFieldSurvey?: boolean;
  fieldEvidence?: {
    rootableSoilDepthMeasurementsCm?: number[];
    surfaceStoniness?: string;
    bedrockOutcrop?: string;
    machineAccess?: string;
    drainageObservation?: string;
  };
  cropIds?: string[];
  includeDetails?: boolean;
  includeExistingScores?: boolean;
  includeLandUsability?: boolean;
  requirementProfileMode?: 'active' | 'static_fallback' | 'explicit';
  requirementProfileIds?: Record<string, string>;
  dryRun?: boolean;
}

export interface CropPhysicalCompatibilityAnalyzeResponse {
  parcel: {
    title: string | null;
    areaSquareMeters: number | null;
    landType: string | null;
    geometryType: string;
  };
  landUsability: {
    status: string | null;
    physicalSuitability: string | null;
    confidence: string | null;
    recommendationsArePreliminary: true;
  } | null;
  cropSelection: {
    mode: 'top_n' | 'selected_crops';
    label: 'Top-5' | 'Selected Crops';
    cropIds: string[];
    ranks: number[];
  };
  crops: Array<{
    cropId: string;
    cropName: string;
    existingRecommendationScore: number | null;
    existingRank: number | null;
    requirementResolution: RequirementResolutionMeta;
    physicalCompatibility:
      | CropPhysicalCompatibilityResult
      | CropPhysicalCompatibilitySummary;
  }>;
  audit: {
    calibrationVersion: string;
    cropCount: number;
    fieldSurveyId: string | null;
    terrainProvider: string | null;
    terrainReal: boolean;
    mockExcluded: boolean;
    requirementProfileMode: string;
    dryRun: boolean;
  };
  validation: { checks: CropPhysicalCompatibilityCheck[] };
  limitations: string[];
}

export class CropPhysicalCompatibilityService {
  private readonly engine = new CropPhysicalCompatibilityEngine();
  private readonly calibration = new ScoreCalibrationService();

  constructor(
    private readonly parcelQueryService: ParcelQueryService,
    private readonly cropKnowledgeService: CropKnowledgeService,
    private readonly terrainProfileService: TerrainProfileService | null,
    private readonly fieldSurveyService: FieldSurveyService | null,
    private readonly landUsabilityService: LandUsabilityService | null,
    private readonly cropRecommendationService: CropRecommendationService | null = null,
    private readonly calibrationManagementService: CalibrationManagementService | null = null,
  ) {}

  assertEnabled(): void {
    if (!getEnv().CROP_PHYSICAL_COMPATIBILITY_ENABLED) {
      throw new ApiError(503, 'Crop physical compatibility is disabled', {
        code: 'CROP_PHYSICAL_COMPATIBILITY_DISABLED',
      });
    }
  }

  async analyze(
    request: CropPhysicalCompatibilityAnalyzeRequest,
  ): Promise<CropPhysicalCompatibilityAnalyzeResponse> {
    this.assertEnabled();

    if (request.geometry && request.parcelQuery) {
      throw new ApiError(400, 'Provide either geometry or parcelQuery, not both');
    }
    if (!request.geometry && !request.parcelQuery) {
      throw new ApiError(400, 'Either geometry or parcelQuery is required');
    }
    if (
      (request.fieldSurveyId || request.useLatestApprovedFieldSurvey) &&
      !request.parcelQuery
    ) {
      throw new ApiError(
        400,
        'parcelQuery is required when fieldSurveyId or useLatestApprovedFieldSurvey is set',
      );
    }

    const profile = this.calibration.getProfile();
    const compatCal = resolveCropPhysicalCompatibilityCalibration(
      profile.cropPhysicalCompatibility,
    );

    let parcel = null as Awaited<
      ReturnType<ParcelQueryService['resolve']>
    >['parcel'] | null;
    let geometry;

    if (request.parcelQuery) {
      const resolved = await this.parcelQueryService.resolve(request.parcelQuery);
      parcel = resolved.parcel;
      geometry = resolved.parcel.geometry;
    } else {
      const { normalizeGeoJsonGeometry } = await import(
        '../../../utils/geometry.utils.js'
      );
      geometry = normalizeGeoJsonGeometry(request.geometry!);
    }

    // Terrain (reuse cache)
    let terrainProfile = null;
    if (this.terrainProfileService) {
      try {
        terrainProfile = await this.terrainProfileService.getProfile({
          resolved: { geometry, parcel },
        });
      } catch (error) {
        console.warn('[CropPhysicalCompatibility] terrain failed', {
          message: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    // Field survey
    let fieldNative: ParcelPhysicalEvidence['field'] = null;
    let fieldSurveyId: string | null = null;
    if (this.fieldSurveyService && request.parcelQuery) {
      try {
        const { disposition } = await this.fieldSurveyService.resolveForLandUsability({
          parcelQuery: request.parcelQuery,
          fieldSurveyId: request.fieldSurveyId,
          useLatestApprovedFieldSurvey:
            request.useLatestApprovedFieldSurvey ?? !request.fieldSurveyId,
        });
        if (disposition.disposition === 'usable') {
          const n = disposition.evidence;
          fieldSurveyId = n.surveyId;
          fieldNative = {
            surveyId: n.surveyId,
            rootableSoilDepth: {
              verified: n.rootableSoilDepth.verified,
              minimumCm: n.rootableSoilDepth.minimumCm,
              meanCm: n.rootableSoilDepth.meanCm,
              medianCm: n.rootableSoilDepth.medianCm,
              maximumCm: n.rootableSoilDepth.maximumCm,
              measurementCount: n.rootableSoilDepth.measurementCount,
              confidence: n.rootableSoilDepth.confidence,
            },
            surfaceStoniness: n.surfaceStoniness.classification,
            bedrockOutcrop: n.bedrockOutcrop.classification,
            machineAccess: n.machineAccess.classification,
            drainage: n.drainage.classification,
          };
        }
      } catch (error) {
        console.warn('[CropPhysicalCompatibility] field survey resolve failed', {
          message: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    // Inline fieldEvidence fallback (narrow LU enums mapped lightly)
    if (!fieldNative && request.fieldEvidence) {
      const fe = request.fieldEvidence;
      const depths = fe.rootableSoilDepthMeasurementsCm ?? [];
      const mean =
        depths.length > 0
          ? depths.reduce((a, b) => a + b, 0) / depths.length
          : null;
      const sorted = [...depths].sort((a, b) => a - b);
      fieldNative = {
        rootableSoilDepth:
          mean != null
            ? {
                verified: true,
                minimumCm: sorted[0] ?? null,
                meanCm: Math.round(mean * 10) / 10,
                medianCm: sorted[Math.floor(sorted.length / 2)] ?? null,
                maximumCm: sorted[sorted.length - 1] ?? null,
                measurementCount: depths.length,
                confidence: depths.length >= 5 ? 'medium' : 'low',
              }
            : null,
        surfaceStoniness: fe.surfaceStoniness ?? null,
        bedrockOutcrop: mapBedrock(fe.bedrockOutcrop),
        machineAccess: mapMachine(fe.machineAccess),
        drainage: fe.drainageObservation ?? null,
      };
    }

    // Surface / LU summary is optional (expensive); do not re-fetch Sentinel by default.
    let surfaceEvidence: ParcelPhysicalEvidence['surface'] = null;
    let landUsabilitySummary: CropPhysicalCompatibilityAnalyzeResponse['landUsability'] =
      null;

    if (
      request.includeLandUsability &&
      this.landUsabilityService &&
      request.parcelQuery
    ) {
      try {
        const lu = await this.landUsabilityService.analyze({
          parcelQuery: request.parcelQuery,
          includeTerrain: true,
          includeSurfaceAnalysis: true,
          includeSoil: true,
          includeClimate: false,
          fieldSurveyId: fieldSurveyId ?? undefined,
          useLatestApprovedFieldSurvey: Boolean(fieldSurveyId),
          surfaceAnalysisOptions: {
            analysisMonths: 24,
            maxCloudCoveragePercent: 30,
          },
        });
        landUsabilitySummary = {
          status: lu.landUsability.status,
          physicalSuitability: lu.landUsability.physicalSuitability,
          confidence: lu.landUsability.confidence,
          recommendationsArePreliminary: true,
        };
        const rock = lu.components.probableRockSignal as {
          classification?: string;
          score?: number;
        };
        const sa = lu.components.surfaceActivity as { providerReal?: boolean };
        if (sa?.providerReal) {
          surfaceEvidence = {
            providerReal: true,
            probableRockClassification: rock?.classification ?? null,
            probableRockScore: rock?.score ?? null,
          };
        }
      } catch (error) {
        console.warn('[CropPhysicalCompatibility] land usability failed', {
          message: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    const terrainMock =
      !terrainProfile ||
      terrainProfile.metadata.isMock === true ||
      terrainProfile.metadata.fallbackUsed === true ||
      String(terrainProfile.metadata.provider).includes('mock');
    const terrainReal = Boolean(terrainProfile && !terrainMock);

    const evidence: ParcelPhysicalEvidence = {
      terrainReal,
      terrainMock: Boolean(terrainProfile && terrainMock),
      terrain: terrainProfile
        ? {
            provider: terrainProfile.metadata.provider,
            dataset: terrainProfile.metadata.dataset ?? null,
            meanSlopePercent: terrainProfile.terrain.slope.meanPercent,
            p90SlopePercent: terrainProfile.terrain.slope.p90Percent,
            maximumSlopePercent: terrainProfile.terrain.slope.maximumPercent,
            ruggednessClass: terrainProfile.terrain.ruggedness.classification,
            mechanization: terrainProfile.terrain.mechanization.terrainSuitability,
            coverageStatus: terrainProfile.terrain.coverage?.coverageStatus ?? null,
            spatialConfidence: terrainProfile.metadata.spatialConfidence,
          }
        : null,
      field: fieldNative,
      surface: surfaceEvidence,
      soilMock: false,
      soilProvider: null,
    };

    // Existing scores (optional, additive only)
    const scoreById = new Map<string, { score: number; rank: number }>();
    if (request.includeExistingScores !== false && this.cropRecommendationService) {
      try {
        const evalResult = await this.cropRecommendationService.evaluate({
          geometry: request.geometry,
          parcelQuery: request.parcelQuery,
          options: {
            timeSeriesMonths: 6,
            topN: 14,
            climateYears: 10,
            analysisDays: 30,
            maxCloudCoverage: 20,
          },
        });
        evalResult.recommendations.forEach((item, index) => {
          scoreById.set(item.crop.id, {
            score: item.score.final,
            rank: index + 1,
          });
        });
      } catch (error) {
        console.warn('[CropPhysicalCompatibility] existing scores unavailable', {
          message: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    let crops = this.cropKnowledgeService.listAll();
    if (request.cropIds?.length) {
      const wanted = new Set(request.cropIds);
      const found = crops.filter((c) => wanted.has(c.id));
      const missing = request.cropIds.filter((id) => !found.some((c) => c.id === id));
      if (missing.length) {
        throw new ApiError(404, 'Unknown crop id(s)', { missing });
      }
      crops = found;
    }

    const includeDetails = request.includeDetails !== false;
    const mode = request.requirementProfileMode ?? 'active';
    const dryRun = request.dryRun === true;
    const allChecks: CropPhysicalCompatibilityCheck[] = [];
    const cropResults = [];

    for (const crop of crops) {
      const existing = scoreById.get(crop.id) ?? null;
      const resolved = await this.resolveRequirementsForCrop(crop, {
        mode,
        explicitProfileId: request.requirementProfileIds?.[crop.id],
        dryRun,
      });
      const effectiveCrop: CropKnowledge = {
        ...crop,
        physicalRequirements:
          (resolved.requirements as CropKnowledge['physicalRequirements']) ??
          crop.physicalRequirements,
      };
      const { result, checks } = this.engine.evaluateCrop({
        crop: effectiveCrop,
        evidence,
        calibration: compatCal,
        calibrationVersion: profile.version,
        existingScore: existing?.score ?? null,
      });
      allChecks.push(...checks);

      const summary: CropPhysicalCompatibilitySummary = {
        classification: result.classification,
        confidence: result.confidence,
        recommendationImpactApplied: false,
        requirementProfileId: resolved.resolution.profileId,
        requirementProfileVersion: resolved.resolution.profileVersion,
        requirementValidationStatus: resolved.resolution.validationStatus,
        requirementFallbackUsed: resolved.resolution.fallbackUsed,
      };

      cropResults.push({
        cropId: crop.id,
        cropName: crop.name,
        existingRecommendationScore: existing?.score ?? null,
        existingRank: existing?.rank ?? null,
        requirementResolution: resolved.resolution,
        physicalCompatibility: includeDetails ? result : summary,
      });
    }

    const ranked = [...scoreById.entries()].map(([cropId, v]) => ({
      cropId,
      rank: v.rank,
    }));
    // If scores unavailable, synthesize ranks from response order for labeling only
    const rankedForSelection =
      ranked.length > 0
        ? ranked
        : cropResults.map((c, i) => ({
            cropId: c.cropId,
            rank: c.existingRank ?? i + 1,
          }));
    const cropSelection = selectCropsForReport({
      ranked: rankedForSelection,
      cropIds: request.cropIds,
      topN: 5,
    });

    return {
      parcel: {
        title: parcel?.title ?? null,
        areaSquareMeters: parcel?.areaSquareMeters ?? null,
        landType: parcel?.landType ?? null,
        geometryType: geometry.type,
      },
      landUsability: landUsabilitySummary,
      cropSelection,
      crops: cropResults,
      audit: {
        calibrationVersion: profile.version,
        cropCount: cropResults.length,
        fieldSurveyId,
        terrainProvider: terrainProfile?.metadata.provider ?? null,
        terrainReal,
        mockExcluded: evidence.terrainMock,
        requirementProfileMode: mode,
        dryRun,
      },
      validation: { checks: allChecks },
      limitations: [
        'Crop physical compatibility ürün skorunu, sıralamasını veya elemesini değiştirmez.',
        'Ürün physicalRequirements ve kalibrasyon unvalidated durumdadır.',
        'Verim, ekonomi, jeoloji veya erozyon modeli içermez.',
        'recommendationsArePreliminary=true kalır.',
        'Draft requirement profiles yalnızca dryRun=true ile kullanılabilir.',
      ],
    };
  }

  private async resolveRequirementsForCrop(
    crop: CropKnowledge,
    options: {
      mode: 'active' | 'static_fallback' | 'explicit';
      explicitProfileId?: string;
      dryRun?: boolean;
    },
  ): Promise<{
    requirements: unknown | null;
    resolution: RequirementResolutionMeta;
  }> {
    if (
      !this.calibrationManagementService ||
      !getEnv().CALIBRATION_MANAGEMENT_ENABLED ||
      options.mode === 'static_fallback'
    ) {
      return {
        requirements: crop.physicalRequirements ?? null,
        resolution: {
          mode: 'static_fallback',
          profileId: null,
          profileVersion: null,
          profileStatus: null,
          validationStatus: 'unvalidated',
          fallbackUsed: true,
          source: 'static_unvalidated_fallback',
        },
      };
    }

    return this.calibrationManagementService.resolveForCrop(crop.id, {
      mode: options.mode,
      explicitProfileId: options.explicitProfileId,
      dryRun: options.dryRun,
    });
  }

  /** Build additive per-crop summary for evaluate endpoint (no re-fetch storm). */
  evaluateFromEvidence(input: {
    crops: Array<{ crop: CropKnowledge; score: number; rank: number }>;
    evidence: ParcelPhysicalEvidence;
  }): Map<string, CropPhysicalCompatibilitySummary> {
    const profile = this.calibration.getProfile();
    const compatCal = resolveCropPhysicalCompatibilityCalibration(
      profile.cropPhysicalCompatibility,
    );
    const map = new Map<string, CropPhysicalCompatibilitySummary>();
    for (const item of input.crops) {
      const { result } = this.engine.evaluateCrop({
        crop: item.crop,
        evidence: input.evidence,
        calibration: compatCal,
        calibrationVersion: profile.version,
        existingScore: item.score,
      });
      map.set(item.crop.id, {
        classification: result.classification,
        confidence: result.confidence,
        recommendationImpactApplied: false,
      });
    }
    return map;
  }
}

function mapBedrock(value?: string): string | null {
  if (!value || value === 'unknown') return value ?? null;
  if (value === 'sparse') return 'scattered';
  return value;
}

function mapMachine(value?: string): string | null {
  if (!value || value === 'unknown') return value ?? null;
  if (value === 'verified') return 'verified_accessible';
  if (value === 'limited') return 'accessible_with_limitations';
  if (value === 'impossible') return 'impossible';
  return value;
}
