import type { GeoJsonInput, NormalizedGeometry } from '../../../types/geojson.types.js';
import type { ParcelQuery } from '../../parcel/types/parcel.types.js';
import type { ParcelQueryService } from '../../parcel/services/parcel-query.service.js';
import type { TerrainProfileService } from '../../terrain/services/terrain-profile.service.js';
import type { SoilProfileService } from '../../environment/soil/services/soil-profile.service.js';
import type { ClimateProfileService } from '../../environment/climate/services/climate-profile.service.js';
import { SurfaceAnalysisOrchestratorService } from '../../satellite/surface-analysis/surface-analysis-orchestrator.service.js';
import { ScoreCalibrationService } from '../../crop-recommendation/calibration/score-calibration.service.js';
import { resolveLandUsabilityCalibration } from '../constants/land-usability-calibration.js';
import { normalizeGeoJsonGeometry } from '../../../utils/geometry.utils.js';
import { ApiError } from '../../../utils/api-error.js';
import { normalizeSurfaceEvidence } from './surface-evidence-adapter.service.js';
import { resolveRootableSoilDepth } from './rootable-soil-depth.service.js';
import { EvidenceResolutionService } from './evidence-resolution.service.js';
import { PhysicalSuitabilityService } from './physical-suitability.service.js';
import { FieldVerificationRequirementsService } from './field-verification-requirements.service.js';
import { LandUsabilityAuditService } from './land-usability-audit.service.js';
import { LandUsabilityValidationService } from './land-usability-validation.service.js';
import type {
  FieldEvidenceInput,
  LandUsabilityAdditiveSummary,
  LandUsabilityAnalyzeResponse,
  LandUsabilityAudit,
} from '../types/land-usability.types.js';
import type { FieldSurveyService } from '../../field-survey/services/field-survey.service.js';
import type { FieldEvidenceDisposition } from '../../field-survey/services/field-evidence-adapter.service.js';

export interface LandUsabilityAnalyzeRequest {
  geometry?: GeoJsonInput;
  parcelQuery?: ParcelQuery;
  includeTerrain?: boolean;
  includeSurfaceAnalysis?: boolean;
  includeSoil?: boolean;
  includeClimate?: boolean;
  surfaceAnalysisOptions?: {
    analysisMonths?: number;
    months?: number;
    maxCloudCoveragePercent?: number;
    maxCloudCoverage?: number;
  };
  fieldEvidence?: FieldEvidenceInput;
  fieldSurveyId?: string;
  useLatestApprovedFieldSurvey?: boolean;
}

export class LandUsabilityService {
  private readonly surfaceOrchestrator: SurfaceAnalysisOrchestratorService;

  constructor(
    private readonly parcelQueryService: ParcelQueryService,
    private readonly terrainProfileService: TerrainProfileService | null = null,
    private readonly soilProfileService: SoilProfileService | null = null,
    _climateProfileService: ClimateProfileService | null = null,
    private readonly fieldSurveyService: FieldSurveyService | null = null,
    private readonly calibration = new ScoreCalibrationService(),
    private readonly evidenceResolution = new EvidenceResolutionService(),
    private readonly physicalSuitability = new PhysicalSuitabilityService(),
    private readonly fieldChecks = new FieldVerificationRequirementsService(),
    private readonly auditService = new LandUsabilityAuditService(),
    private readonly validationService = new LandUsabilityValidationService(),
  ) {
    this.surfaceOrchestrator = new SurfaceAnalysisOrchestratorService(
      parcelQueryService,
    );
  }

  async analyze(
    request: LandUsabilityAnalyzeRequest,
  ): Promise<LandUsabilityAnalyzeResponse> {
    const includeTerrain = request.includeTerrain !== false;
    const includeSurface = request.includeSurfaceAnalysis !== false;
    const includeSoil = request.includeSoil !== false;

    const { parcel, geometry } = await this.resolveParcel(request);
    const luCal = resolveLandUsabilityCalibration(
      this.calibration.getProfile().landUsability,
    );

    const surveyResolution = await this.resolveFieldSurveyEvidence(request);

    const months =
      request.surfaceAnalysisOptions?.analysisMonths ??
      request.surfaceAnalysisOptions?.months ??
      12;
    const maxCloudCoverage =
      request.surfaceAnalysisOptions?.maxCloudCoveragePercent ??
      request.surfaceAnalysisOptions?.maxCloudCoverage ??
      20;

    let surfaceRaw = null;
    if (includeSurface) {
      try {
        surfaceRaw = await this.surfaceOrchestrator.analyze({
          geometry,
          months,
          maxCloudCoverage,
        });
      } catch {
        surfaceRaw = null;
      }
    }

    let terrain = null;
    if (includeTerrain && this.terrainProfileService) {
      try {
        terrain = await this.terrainProfileService.getProfile({
          resolved: {
            geometry,
            parcel,
          },
        });
      } catch {
        terrain = null;
      }
    }

    let soil = null;
    if (includeSoil && this.soilProfileService) {
      try {
        soil = await this.soilProfileService.getProfile({
          resolved: {
            geometry,
            parcel: request.parcelQuery,
          },
        });
      } catch {
        soil = null;
      }
    }

    const surface = normalizeSurfaceEvidence(surfaceRaw);
    const mergedFieldEvidence = this.mergeFieldEvidence(
      request.fieldEvidence,
      surveyResolution.disposition,
    );
    const rootableSoilDepth = resolveRootableSoilDepth(
      mergedFieldEvidence,
      luCal,
    );

    const bundle = this.evidenceResolution.resolve({
      surface,
      terrain,
      soil,
      rootableSoilDepth,
      fieldEvidence: mergedFieldEvidence,
      calibration: luCal,
    });

    this.applySurveyDispositionToIgnored(bundle, surveyResolution.disposition);

    // Invariant: supporting and limiting cannot share codes
    const limitingCodes = new Set(bundle.limitingFactors.map((e) => e.code));
    bundle.supportingEvidence = bundle.supportingEvidence.filter(
      (e) => !limitingCodes.has(e.code),
    );

    const outcome = this.physicalSuitability.decide(bundle, luCal);
    const requiredFieldChecks = this.fieldChecks.build(bundle, luCal);
    const audit = this.auditService.build(
      bundle,
      outcome,
      this.calibration.getProfile().version,
      this.buildFieldSurveyAudit(surveyResolution),
    );
    const validationChecks = this.validationService.buildChecks(
      bundle,
      outcome,
      luCal,
    );

    const limitations = [
      'Land usability sonucu ön değerlendirmedir; kesin tarımsal uygunluk hükmü değildir.',
      'recommendationsArePreliminary her zaman true kalır (bu sürüm).',
      'Mock DEM / mock soil gerçek fiziksel kanıt olarak kullanılmaz.',
      'Probable rock sinyali tek başına strong physical constraint üretmez.',
      'Köklenebilir toprak derinliği uzaktan doğrulanamaz.',
      `Kalibrasyon: ${luCal.source} (${luCal.validationStatus}).`,
    ];

    return {
      parcel: {
        title: parcel?.title ?? null,
        areaSquareMeters: parcel?.areaSquareMeters ?? null,
        landType: parcel?.landType ?? null,
        geometryType: geometry.type,
      },
      landUsability: {
        status: outcome.decision.status,
        physicalSuitability: outcome.decision.physicalSuitability.classification,
        confidence: outcome.decision.confidence,
        recommendationsArePreliminary: true,
      },
      components: {
        surfaceActivity: surface
          ? {
              providerReal: surface.providerReal,
              usableObservationCount: surface.usableObservationCount,
              seasonsRepresented: surface.seasonsRepresented,
              dataConfidence: surface.dataConfidence,
              seasonalAmplitude: surface.seasonalAmplitude,
              agriculturalCycleClassification:
                surface.agriculturalCycleClassification,
              agriculturalCycleDetected: surface.agriculturalCycleDetected,
              lowNdviShare: surface.lowNdviShare,
              highBsiShare: surface.highBsiShare,
              vegetatedShare: surface.vegetatedShare,
              openSurfaceRatio: surface.persistentOpenSurfaceRatio,
              persistentOpenSurfaceRatio: surface.persistentOpenSurfaceRatio,
              availableSignals: surface.availableSignals,
              missingCanonicalFields: surface.missingCanonicalFields,
            }
          : { available: false },
        probableRockSignal: surface
          ? {
              score: surface.probableRockScore,
              classification: surface.probableRockClassification,
              notARockPercentage: true,
            }
          : { available: false },
        terrain: terrain
          ? {
              provider: terrain.metadata.provider,
              isMock: terrain.metadata.isMock,
              fallbackUsed: terrain.metadata.fallbackUsed,
              usedInDecision: bundle.terrainReal,
              spatialConfidence: terrain.metadata.spatialConfidence,
              dataset: terrain.metadata.dataset ?? terrain.terrain.provider?.dataset ?? null,
              coverageStatus: terrain.terrain.coverage?.coverageStatus ?? null,
              meanSlopePercent: terrain.terrain.slope.meanPercent,
              p90SlopePercent: terrain.terrain.slope.p90Percent,
              ruggednessClass: terrain.terrain.ruggedness.classification,
              terrainMechanizationSuitability:
                terrain.terrain.terrainMechanizationSuitability ?? null,
            }
          : { available: false, usedInDecision: false },
        soil: soil
          ? {
              provider: soil.provider,
              isMock: soil.metadata.isMock === true,
              isEstimated: soil.metadata.isEstimated === true,
              usedAsVerifiedDepth: false,
            }
          : { available: false },
        rootableSoilDepth,
        modeledSoilDepth: bundle.modeledSoilDepth,
      },
      supportingEvidence: bundle.supportingEvidence,
      limitingFactors: bundle.limitingFactors,
      unknownFactors: bundle.unknownFactors,
      ignoredEvidence: bundle.ignoredEvidence,
      requiredFieldChecks,
      sourceResolution: bundle.sourceResolution,
      audit,
      validation: { checks: validationChecks },
      limitations,
    };
  }

  async summarizeForCropEndpoints(
    request: LandUsabilityAnalyzeRequest,
  ): Promise<LandUsabilityAdditiveSummary | null> {
    try {
      const full = await this.analyze({
        ...request,
        surfaceAnalysisOptions: request.surfaceAnalysisOptions ?? {
          analysisMonths: 6,
          maxCloudCoveragePercent: 20,
        },
      });
      return {
        status: full.landUsability.status,
        physicalSuitability: full.landUsability.physicalSuitability,
        confidence: full.landUsability.confidence,
        recommendationsArePreliminary: true,
      };
    } catch {
      return null;
    }
  }

  /**
   * Build decision from already-fetched components (no Process API re-fetch).
   * Used by crop evaluate / validation-report additive paths.
   */
  analyzeFromResolved(input: {
    parcel: Awaited<ReturnType<ParcelQueryService['resolve']>>['parcel'] | null;
    geometry: NormalizedGeometry;
    surfaceAnalysis: import('../../satellite/surface-analysis/surface-analysis.types.js').SurfaceAnalysisResponse | null;
    terrain: import('../../terrain/types/terrain.types.js').TerrainProfileResponse | null;
    soil: import('../../environment/soil/types/soil.types.js').SoilProfile | null;
    fieldEvidence?: FieldEvidenceInput;
  }): LandUsabilityAnalyzeResponse {
    const luCal = resolveLandUsabilityCalibration(
      this.calibration.getProfile().landUsability,
    );
    const surface = normalizeSurfaceEvidence(input.surfaceAnalysis);
    const rootableSoilDepth = resolveRootableSoilDepth(input.fieldEvidence, luCal);
    const bundle = this.evidenceResolution.resolve({
      surface,
      terrain: input.terrain,
      soil: input.soil,
      rootableSoilDepth,
      fieldEvidence: input.fieldEvidence,
      calibration: luCal,
    });
    const limitingCodes = new Set(bundle.limitingFactors.map((e) => e.code));
    bundle.supportingEvidence = bundle.supportingEvidence.filter(
      (e) => !limitingCodes.has(e.code),
    );
    const outcome = this.physicalSuitability.decide(bundle, luCal);
    const requiredFieldChecks = this.fieldChecks.build(bundle, luCal);
    const audit = this.auditService.build(
      bundle,
      outcome,
      this.calibration.getProfile().version,
    );
    const validationChecks = this.validationService.buildChecks(
      bundle,
      outcome,
      luCal,
    );

    return {
      parcel: {
        title: input.parcel?.title ?? null,
        areaSquareMeters: input.parcel?.areaSquareMeters ?? null,
        landType: input.parcel?.landType ?? null,
        geometryType: input.geometry.type,
      },
      landUsability: {
        status: outcome.decision.status,
        physicalSuitability: outcome.decision.physicalSuitability.classification,
        confidence: outcome.decision.confidence,
        recommendationsArePreliminary: true,
      },
      components: {
        surfaceActivity: surface
          ? {
              providerReal: surface.providerReal,
              usableObservationCount: surface.usableObservationCount,
              seasonsRepresented: surface.seasonsRepresented,
              dataConfidence: surface.dataConfidence,
              seasonalAmplitude: surface.seasonalAmplitude,
              agriculturalCycleClassification:
                surface.agriculturalCycleClassification,
              agriculturalCycleDetected: surface.agriculturalCycleDetected,
              lowNdviShare: surface.lowNdviShare,
              highBsiShare: surface.highBsiShare,
              vegetatedShare: surface.vegetatedShare,
              openSurfaceRatio: surface.persistentOpenSurfaceRatio,
              persistentOpenSurfaceRatio: surface.persistentOpenSurfaceRatio,
              availableSignals: surface.availableSignals,
              missingCanonicalFields: surface.missingCanonicalFields,
            }
          : { available: false },
        probableRockSignal: surface
          ? {
              score: surface.probableRockScore,
              classification: surface.probableRockClassification,
              notARockPercentage: true,
            }
          : { available: false },
        terrain: input.terrain
          ? {
              provider: input.terrain.metadata.provider,
              isMock: input.terrain.metadata.isMock,
              fallbackUsed: input.terrain.metadata.fallbackUsed,
              usedInDecision: bundle.terrainReal,
              spatialConfidence: input.terrain.metadata.spatialConfidence,
              dataset: input.terrain.metadata.dataset ?? input.terrain.terrain.provider?.dataset ?? null,
              coverageStatus: input.terrain.terrain.coverage?.coverageStatus ?? null,
              meanSlopePercent: input.terrain.terrain.slope.meanPercent,
              p90SlopePercent: input.terrain.terrain.slope.p90Percent,
              ruggednessClass: input.terrain.terrain.ruggedness.classification,
              terrainMechanizationSuitability:
                input.terrain.terrain.terrainMechanizationSuitability ?? null,
            }
          : { available: false, usedInDecision: false },
        soil: input.soil
          ? {
              provider: input.soil.provider,
              isMock: input.soil.metadata.isMock === true,
              isEstimated: input.soil.metadata.isEstimated === true,
              usedAsVerifiedDepth: false,
            }
          : { available: false },
        rootableSoilDepth,
        modeledSoilDepth: bundle.modeledSoilDepth,
      },
      supportingEvidence: bundle.supportingEvidence,
      limitingFactors: bundle.limitingFactors,
      unknownFactors: bundle.unknownFactors,
      ignoredEvidence: bundle.ignoredEvidence,
      requiredFieldChecks,
      sourceResolution: bundle.sourceResolution,
      audit,
      validation: { checks: validationChecks },
      limitations: [
        'Land usability sonucu ön değerlendirmedir; kesin tarımsal uygunluk hükmü değildir.',
        'recommendationsArePreliminary her zaman true kalır (bu sürüm).',
      ],
    };
  }

  private async resolveParcel(request: LandUsabilityAnalyzeRequest): Promise<{
    parcel: Awaited<ReturnType<ParcelQueryService['resolve']>>['parcel'] | null;
    geometry: NormalizedGeometry;
  }> {
    if (request.geometry && request.parcelQuery) {
      throw new ApiError(400, 'Provide either geometry or parcelQuery, not both');
    }
    if (!request.geometry && !request.parcelQuery) {
      throw new ApiError(400, 'Either geometry or parcelQuery is required');
    }
    if (request.parcelQuery) {
      const resolved = await this.parcelQueryService.resolve(request.parcelQuery);
      return { parcel: resolved.parcel, geometry: resolved.parcel.geometry };
    }
    return {
      parcel: null,
      geometry: normalizeGeoJsonGeometry(request.geometry!),
    };
  }

  private async resolveFieldSurveyEvidence(
    request: LandUsabilityAnalyzeRequest,
  ): Promise<{
    disposition: FieldEvidenceDisposition | null;
    surveyId: string | null;
    status: string | null;
  }> {
    if (
      !this.fieldSurveyService ||
      !request.parcelQuery ||
      (!request.fieldSurveyId && !request.useLatestApprovedFieldSurvey)
    ) {
      return { disposition: null, surveyId: null, status: null };
    }

    const resolved = await this.fieldSurveyService.resolveForLandUsability({
      parcelQuery: request.parcelQuery,
      fieldSurveyId: request.fieldSurveyId,
      useLatestApprovedFieldSurvey: request.useLatestApprovedFieldSurvey,
    });

    return {
      disposition: resolved.disposition,
      surveyId: resolved.survey?.id ?? null,
      status: resolved.survey?.status ?? null,
    };
  }

  private mergeFieldEvidence(
    requestEvidence: FieldEvidenceInput | undefined,
    disposition: FieldEvidenceDisposition | null,
  ): FieldEvidenceInput | undefined {
    if (disposition?.disposition === 'usable') {
      // Approved survey field evidence has highest priority
      return {
        ...requestEvidence,
        ...disposition.fieldEvidence,
      };
    }
    return requestEvidence;
  }

  private applySurveyDispositionToIgnored(
    bundle: {
      ignoredEvidence: Array<{
        code: string;
        severity?: string;
        reason?: string;
        message?: string;
      }>;
    },
    disposition: FieldEvidenceDisposition | null,
  ): void {
    if (!disposition || disposition.disposition === 'usable') {
      return;
    }
    bundle.ignoredEvidence.push({
      code:
        disposition.disposition === 'pending'
          ? 'FIELD_SURVEY_PENDING'
          : 'FIELD_SURVEY_IGNORED',
      severity: 'important',
      reason: disposition.reason,
      message: `Field survey ${disposition.surveyId || '(none)'} status=${disposition.status}: ${disposition.reason}`,
    });
  }

  private buildFieldSurveyAudit(surveyResolution: {
    disposition: FieldEvidenceDisposition | null;
    surveyId: string | null;
    status: string | null;
  }): LandUsabilityAudit['fieldSurvey'] | undefined {
    if (!surveyResolution.disposition && !surveyResolution.surveyId) {
      return undefined;
    }
    const disposition = surveyResolution.disposition;
    const used = disposition?.disposition === 'usable';
    return {
      used,
      surveyId: surveyResolution.surveyId,
      status: surveyResolution.status,
      evidenceUsed: used,
      evidenceIgnored: !used,
      approvalDate:
        used && disposition?.disposition === 'usable'
          ? disposition.evidence.approvedAt
          : null,
      measurementCount:
        used && disposition?.disposition === 'usable'
          ? disposition.evidence.rootableSoilDepth.measurementCount
          : null,
      disposition: disposition?.disposition ?? 'none',
    };
  }
}
