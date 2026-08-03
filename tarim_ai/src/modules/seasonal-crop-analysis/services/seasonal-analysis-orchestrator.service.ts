import { randomUUID } from 'node:crypto';
import { ApiError } from '../../../utils/api-error.js';
import type { ParcelQueryService } from '../../parcel/services/parcel-query.service.js';
import { buildParcelCacheKey } from '../../parcel/services/parcel-normalization.service.js';
import type { ClimateProfileService } from '../../environment/climate/services/climate-profile.service.js';
import type { SoilProfileService } from '../../environment/soil/services/soil-profile.service.js';
import type { TerrainProfileService } from '../../terrain/services/terrain-profile.service.js';
import type { CropRecommendationService } from '../../crop-recommendation/services/crop-recommendation.service.js';
import type { CropRecommendationResponse } from '../../crop-recommendation/types/recommendation.types.js';
import type { PhysicalSuitabilityFacade } from '../../physical-suitability/services/physical-suitability.facade.js';
import type {
  ProductionScenario,
  ProductionType,
} from '../../physical-suitability/types/physical-suitability.types.js';
import type { SoilAnalysisResult } from '../../physical-suitability/soil-laboratory/types/soil-laboratory.types.js';
import {
  isSentinelConfigured,
  runSatellitePipeline,
} from '../../analysis-orchestrator/services/satellite-pipeline.service.js';
import {
  SeasonalInputResolutionService,
  type InputResolutionSources,
} from './seasonal-input-resolution.service.js';
import { SeasonalCriticalBarrierService } from './seasonal-critical-barrier.service.js';
import {
  SeasonalComponentSuitabilityService,
  buildCropRecommendationLookup,
  type CropRecommendationLookup,
} from './seasonal-component-suitability.service.js';
import { SeasonalOverallSuitabilityService } from './seasonal-overall-suitability.service.js';
import { SeasonalConfidenceService } from './seasonal-confidence.service.js';
import { SeasonalRankingService } from './seasonal-ranking.service.js';
import { SeasonalExplanationService } from './seasonal-explanation.service.js';
import {
  buildInitialSeasonalRecord,
  type SeasonalAnalysisRecord,
  type SeasonalAnalysisRepository,
} from '../repositories/seasonal-analysis.repository.js';
import {
  ALL_STEP_KEYS,
  CROP_CATALOG_ALIASES,
  CROP_RECOMMENDATION_ALIASES,
  ENGINE_VERSION,
  STEP_LABELS,
  TARGET_CROP_CODES,
  type CropAnalysisResult,
  type ExcludedCropEntry,
  type IrrigationAvailabilityInput,
  type PreliminaryCropEntry,
  type ProductionModeInput,
  type RankingEntry,
  type RankingReadiness,
  type ResolvedInputValue,
  type SeasonalAnalysisStatus,
  type SeasonalCropAnalysisRequest,
  type SeasonalCropAnalysisResultData,
  type SeasonalSatelliteContext,
  type SeasonalStep,
  type SeasonalStepKey,
  type UnsupportedCropEntry,
} from '../types/seasonal-crop-analysis.types.js';

const DEFAULT_CALIBRATION_VERSION = 'not_available';
const CROP_EVALUATION_TIMEOUT_MS = 20_000;
const SATELLITE_PIPELINE_TIMEOUT_MS = 20_000;

/**
 * Machine-readable summary of the current barrier + ranking policy, exposed
 * so API consumers never have to infer eligibility rules from crop-level data.
 */
const RANKING_READINESS_POLICY =
  'Critical barriers only block when verificationStatus is ExpertReviewed or Approved; Draft catalog rules never block. Only crops with eligibleForRanking=true and a non-null score receive a rank.';

const CATALOG_ALIAS_LOOKUP: Record<string, string | undefined> = CROP_CATALOG_ALIASES;
const RECOMMENDATION_ALIAS_LOOKUP: Record<string, string | undefined> =
  CROP_RECOMMENDATION_ALIASES;

function resolveCatalogCode(cropCode: string): string {
  return CATALOG_ALIAS_LOOKUP[cropCode] ?? cropCode;
}

function resolveRecommendationCode(catalogCode: string, requestedCode: string): string {
  return RECOMMENDATION_ALIAS_LOOKUP[requestedCode] ?? catalogCode;
}

function sanitizeErrorCode(err: unknown): string {
  if (err instanceof ApiError) {
    return err.code ?? `HTTP_${err.statusCode}`;
  }
  return 'PROVIDER_ERROR';
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ApiError(504, 'Provider timed out', { code: 'PROVIDER_TIMEOUT' }));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function mapIrrigationScenario(
  availability: IrrigationAvailabilityInput,
): 'unknown' | 'rainfed' | 'limited' | 'full' {
  switch (availability) {
    case 'unavailable':
      return 'rainfed';
    case 'available_limited':
      return 'limited';
    case 'available_and_sufficient':
      return 'full';
    default:
      return 'unknown';
  }
}

export interface SeasonalAnalysisOrchestratorDeps {
  parcelQueryService: ParcelQueryService;
  climateProfileService: ClimateProfileService | null;
  soilProfileService: SoilProfileService | null;
  terrainProfileService: TerrainProfileService | null;
  physicalSuitabilityFacade: PhysicalSuitabilityFacade;
  cropRecommendationService: CropRecommendationService | null;
}

export class SeasonalAnalysisOrchestratorService {
  private readonly inputResolution: SeasonalInputResolutionService;
  private readonly barrierService: SeasonalCriticalBarrierService;
  private readonly componentSuitabilityService = new SeasonalComponentSuitabilityService();
  private readonly overallService = new SeasonalOverallSuitabilityService();
  private readonly confidenceService = new SeasonalConfidenceService();
  private readonly rankingService = new SeasonalRankingService();
  private readonly explanationService = new SeasonalExplanationService();

  constructor(
    private readonly repository: SeasonalAnalysisRepository,
    private readonly deps: SeasonalAnalysisOrchestratorDeps,
  ) {
    this.inputResolution = new SeasonalInputResolutionService(deps.physicalSuitabilityFacade);
    this.barrierService = new SeasonalCriticalBarrierService(deps.physicalSuitabilityFacade);
  }

  async createAnalysis(
    request: SeasonalCropAnalysisRequest,
    correlationId: string | null,
  ): Promise<SeasonalAnalysisRecord> {
    const facade = this.deps.physicalSuitabilityFacade;

    // --- Hard pre-flight validation: never invent geometry or evidence. ---
    const resolvedParcel = await this.deps.parcelQueryService.resolve(request.parcelQuery);

    let soilLabResults: SoilAnalysisResult[] | null = null;
    let hasSoilLabReport = false;
    if (request.soilLaboratoryReportId) {
      const aggregate = await facade.getLaboratoryReportAggregate(request.soilLaboratoryReportId);
      if (!aggregate) {
        throw new ApiError(400, 'Soil laboratory report not found', {
          code: 'SOIL_LAB_REPORT_NOT_FOUND',
        });
      }
      if (aggregate.report.status !== 'APPROVED') {
        throw new ApiError(400, 'Soil laboratory report is not approved', {
          code: 'SOIL_LAB_REPORT_NOT_APPROVED',
        });
      }
      hasSoilLabReport = true;
      if (aggregate.report.sampleId && facade.soilLaboratory) {
        const analysis = await facade.getSoilAnalysis(aggregate.report.sampleId);
        soilLabResults = analysis?.results ?? [];
      }
    }

    let hasFieldSurvey = false;
    if (request.fieldSurveyId) {
      const surveyAggregate = await facade.getFieldSurveyAggregate(request.fieldSurveyId);
      if (!surveyAggregate) {
        throw new ApiError(400, 'Field survey not found', { code: 'FIELD_SURVEY_NOT_FOUND' });
      }
      if (surveyAggregate.survey.surveyStatus !== 'APPROVED') {
        throw new ApiError(400, 'Field survey is not approved', {
          code: 'FIELD_SURVEY_NOT_APPROVED',
        });
      }
      hasFieldSurvey = true;
    }

    let hasIrrigationWaterReport = false;
    if (request.irrigationWaterSourceId) {
      const waterAggregate = await facade.getIrrigationWaterAggregate(
        request.irrigationWaterSourceId,
      );
      if (!waterAggregate) {
        throw new ApiError(400, 'Irrigation water source not found', {
          code: 'IRRIGATION_WATER_SOURCE_NOT_FOUND',
        });
      }
      const hasApprovedSample = waterAggregate.samples.some(
        (s) => s.currentStatus === 'APPROVED',
      );
      if (!hasApprovedSample) {
        throw new ApiError(400, 'Irrigation water analysis is not approved', {
          code: 'IRRIGATION_WATER_NOT_APPROVED',
        });
      }
      hasIrrigationWaterReport = true;
    }

    // --- Create the persisted record now that inputs are validated. ---
    const id = randomUUID();
    const steps: SeasonalStep[] = ALL_STEP_KEYS.map((key) => ({
      key,
      label: STEP_LABELS[key],
      status: 'pending' as const,
    }));
    const setStep = (key: SeasonalStepKey, status: SeasonalStep['status'], errorCode?: string) => {
      const step = steps.find((s) => s.key === key);
      if (!step) return;
      step.status = status;
      step.errorCode = errorCode ?? null;
      if (status === 'processing') step.startedAt = new Date().toISOString();
      if (status === 'completed' || status === 'failed' || status === 'partial' || status === 'missing') {
        step.completedAt = new Date().toISOString();
      }
    };

    setStep('parcel', 'completed');
    setStep('soil_lab_report', request.soilLaboratoryReportId ? 'completed' : 'skipped');
    setStep('field_survey', request.fieldSurveyId ? 'completed' : 'skipped');
    setStep('irrigation_water', request.irrigationWaterSourceId ? 'completed' : 'skipped');

    let record = await this.repository.create(
      buildInitialSeasonalRecord(
        id,
        request,
        steps,
        ENGINE_VERSION,
        DEFAULT_CALIBRATION_VERSION,
        correlationId,
      ),
    );
    record = await this.repository.update(id, {
      parcelKey: buildParcelCacheKey(request.parcelQuery),
      steps,
    });

    const limitations: string[] = [];
    let hasOptionalFailure = false;

    const resolvedGeometry = {
      geometry: resolvedParcel.parcel.geometry,
      parcel: request.parcelQuery,
    };

    // --- Optional provider steps: partial-failure safe. ---
    setStep('climate', 'processing');
    let climate = null;
    if (this.deps.climateProfileService) {
      try {
        climate = await this.deps.climateProfileService.getProfile({
          years: 10,
          resolved: resolvedGeometry,
        });
        setStep('climate', 'completed');
      } catch (err) {
        setStep('climate', 'failed', sanitizeErrorCode(err));
        limitations.push('climate_step_failed');
        hasOptionalFailure = true;
      }
    } else {
      setStep('climate', 'skipped');
      limitations.push('climate_service_not_configured');
    }

    setStep('soil', 'processing');
    let soil = null;
    if (this.deps.soilProfileService) {
      try {
        soil = await this.deps.soilProfileService.getProfile({ resolved: resolvedGeometry });
        setStep('soil', 'completed');
      } catch (err) {
        setStep('soil', 'failed', sanitizeErrorCode(err));
        limitations.push('soil_step_failed');
        hasOptionalFailure = true;
      }
    } else {
      setStep('soil', 'skipped');
      limitations.push('soil_service_not_configured');
    }

    setStep('terrain', 'processing');
    let terrain = null;
    if (this.deps.terrainProfileService) {
      try {
        terrain = await this.deps.terrainProfileService.getProfile({
          resolved: { geometry: resolvedParcel.parcel.geometry, parcel: resolvedParcel.parcel },
        });
        setStep('terrain', 'completed');
      } catch (err) {
        setStep('terrain', 'failed', sanitizeErrorCode(err));
        limitations.push('terrain_step_failed');
        hasOptionalFailure = true;
      }
    } else {
      setStep('terrain', 'skipped');
      limitations.push('terrain_service_not_configured');
    }

    // --- Satellite (Sentinel) snapshot: best-effort, never a mock fallback. ---
    setStep('satellite', 'processing');
    let satelliteContext: SeasonalSatelliteContext | null = null;
    if (!isSentinelConfigured()) {
      setStep('satellite', 'skipped');
      limitations.push('sentinel_credentials_missing');
    } else {
      try {
        const pipeline = await withTimeout(
          runSatellitePipeline({
            geometry: resolvedParcel.parcel.geometry,
            analysisId: id,
            months: 6,
            days: 90,
            maxCloudCoverage: 30,
          }),
          SATELLITE_PIPELINE_TIMEOUT_MS,
        );
        satelliteContext = {
          dateRange: pipeline.dateRange,
          candidateObservationCount: pipeline.candidateObservationCount,
          usableObservationCount: pipeline.usableObservationCount,
          selectedObservationDate: pipeline.selected?.datetime ?? null,
          ndviMean: pipeline.summary?.indices.ndvi.mean ?? null,
          warnings: pipeline.warnings,
        };
        setStep('satellite', 'completed');
      } catch (err) {
        setStep('satellite', 'failed', sanitizeErrorCode(err));
        limitations.push('satellite_step_failed');
        hasOptionalFailure = true;
      }
    }

    // --- Resolve inputs for criteria used by barriers/scoring. ---
    const inputSources: InputResolutionSources = {
      climate,
      soil,
      terrain,
      soilLabResults,
      irrigationAvailability: request.irrigationAvailability,
    };
    const { resolved: resolvedInputs, byCriterion, limitations: resolutionLimitations } =
      await this.inputResolution.resolve(inputSources);
    limitations.push(...resolutionLimitations);

    // --- Crop-recommendation engine snapshot (shared across all target crops). ---
    setStep('crop_evaluation', 'processing');
    let cropRecommendationResponse: CropRecommendationResponse | null = null;
    if (this.deps.cropRecommendationService) {
      try {
        cropRecommendationResponse = await withTimeout(
          this.deps.cropRecommendationService.evaluate({
            parcelQuery: request.parcelQuery,
            options: {
              timeSeriesMonths: 6,
              topN: 14,
              climateYears: 10,
              analysisDays: 30,
              maxCloudCoverage: 40,
              irrigationScenario: mapIrrigationScenario(request.irrigationAvailability),
            },
          }),
          CROP_EVALUATION_TIMEOUT_MS,
        );
        setStep('crop_evaluation', 'completed');
      } catch (err) {
        setStep('crop_evaluation', 'failed', sanitizeErrorCode(err));
        limitations.push('crop_recommendation_engine_unavailable');
        hasOptionalFailure = true;
      }
    } else {
      setStep('crop_evaluation', 'skipped');
      limitations.push('crop_recommendation_service_not_configured');
    }

    const cropRecommendationLookup: Map<string, CropRecommendationLookup> =
      buildCropRecommendationLookup(cropRecommendationResponse);
    const calibrationVersion =
      cropRecommendationResponse?.metadata.scoringModelVersion ?? DEFAULT_CALIBRATION_VERSION;

    // --- Per-crop evaluation. ---
    const targetCodes = request.targetCropCodes ?? [...TARGET_CROP_CODES];
    const crops: CropAnalysisResult[] = [];
    const unsupportedCrops: UnsupportedCropEntry[] = [];

    for (const requestedCode of targetCodes) {
      try {
        const outcome = await this.evaluateCrop({
          requestedCode,
          request,
          facade,
          byCriterion,
          resolvedInputs,
          cropRecommendationLookup,
          hasSoilLabReport,
          hasFieldSurvey,
          hasIrrigationWaterReport,
        });
        if (outcome.kind === 'unsupported') {
          unsupportedCrops.push({ cropCode: requestedCode, reason: outcome.reason });
        } else {
          crops.push(outcome.result);
        }
      } catch (err) {
        unsupportedCrops.push({
          cropCode: requestedCode,
          reason: `evaluation_failed:${sanitizeErrorCode(err)}`,
        });
        hasOptionalFailure = true;
      }
    }

    const rankedCrops = this.rankingService.rank(crops);

    const ranking: RankingEntry[] = rankedCrops
      .filter((c) => c.rank != null && c.overall.score != null)
      .map((c) => ({
        cropCode: c.requestedCropCode,
        rank: c.rank as number,
        score: c.overall.score as number,
        confidence: c.confidence.level,
      }));

    const excludedCrops: ExcludedCropEntry[] = rankedCrops
      .filter((c) => c.overall.classification === 'blocked_by_barrier')
      .map((c) => ({
        cropCode: c.requestedCropCode,
        reason: 'blocked_by_critical_barrier',
        barrierCodes: c.overall.blockingBarrierCodes,
      }));

    const preliminaryCrops: PreliminaryCropEntry[] = rankedCrops
      .filter((c) => c.overall.classification === 'preliminary_only')
      .map((c) => ({
        cropCode: c.requestedCropCode,
        reason: c.confidence.reasons[0] ?? 'insufficient_data_for_ranking',
      }));

    const rankingReadiness: RankingReadiness = {
      rankingReadyCropCount: ranking.length,
      preliminaryCropCount: preliminaryCrops.length,
      unsupportedCropCount: unsupportedCrops.length,
      excludedCropCount: excludedCrops.length,
      policy: RANKING_READINESS_POLICY,
    };

    const now = new Date().toISOString();
    const status: SeasonalAnalysisStatus = hasOptionalFailure ? 'partial_completed' : 'completed';

    const result: SeasonalCropAnalysisResultData = {
      analysisId: id,
      status,
      parcelKey: buildParcelCacheKey(request.parcelQuery),
      parcel: {
        province: resolvedParcel.parcel.province,
        district: resolvedParcel.parcel.district,
        neighborhood: resolvedParcel.parcel.neighborhood,
        block: resolvedParcel.parcel.block,
        parcel: resolvedParcel.parcel.parcel,
        areaSquareMeters: resolvedParcel.parcel.areaSquareMeters,
        provider: resolvedParcel.parcel.provider,
        verified: resolvedParcel.parcel.verified,
      },
      request: {
        seasonYear: request.seasonYear,
        productionMode: request.productionMode,
        irrigationAvailability: request.irrigationAvailability,
      },
      steps,
      resolvedInputs,
      crops: rankedCrops,
      unsupportedCrops,
      rankingReadiness,
      ranking,
      preliminaryCrops,
      excludedCrops,
      satelliteContext,
      limitations: [...new Set(limitations)],
      engineVersion: ENGINE_VERSION,
      calibrationVersion,
      generatedAt: now,
    };

    record = await this.repository.update(
      id,
      {
        status,
        progress: 100,
        steps,
        result,
        completedAt: now,
      },
      { expectedVersion: record.version },
    );

    return record;
  }

  private async evaluateCrop(input: {
    requestedCode: string;
    request: SeasonalCropAnalysisRequest;
    facade: PhysicalSuitabilityFacade;
    byCriterion: Map<string, ResolvedInputValue>;
    resolvedInputs: ResolvedInputValue[];
    cropRecommendationLookup: Map<string, CropRecommendationLookup>;
    hasSoilLabReport: boolean;
    hasFieldSurvey: boolean;
    hasIrrigationWaterReport: boolean;
  }): Promise<
    | { kind: 'unsupported'; reason: string }
    | { kind: 'result'; result: CropAnalysisResult }
  > {
    const catalogCode = resolveCatalogCode(input.requestedCode);
    const cropProfile = await input.facade.profiles.getCrop(catalogCode);
    if (!cropProfile) {
      return { kind: 'unsupported', reason: 'not_in_physical_suitability_catalog' };
    }

    const scenario = await this.resolveScenario(
      cropProfile.id,
      input.request.productionMode,
      input.request.irrigationAvailability,
      input.facade,
    );

    const recommendationCode = resolveRecommendationCode(catalogCode, input.requestedCode);

    if (!scenario) {
      const overall = {
        eligibleForRanking: false,
        score: null,
        classification: 'preliminary_only' as const,
        blockingBarrierCodes: [],
      };
      const confidence = { level: 'low' as const, reasons: ['no_matching_production_scenario'] };
      return {
        kind: 'result',
        result: {
          requestedCropCode: input.requestedCode,
          catalogCropCode: catalogCode,
          cropName: cropProfile.name,
          supported: true,
          scenarioCode: null,
          productionType: null,
          barriers: [],
          componentSuitability: [
            {
              component: 'overall_recommendation_engine',
              score: null,
              classification: 'insufficient_data',
              limitations: ['no_matching_production_scenario'],
            },
          ],
          overall,
          confidence,
          explanation: this.explanationService.build({
            cropName: cropProfile.name,
            catalogCropCode: catalogCode,
            overall,
            barriers: [],
            confidence,
          }),
          rank: null,
        },
      };
    }

    const barrierResult = await this.barrierService.evaluate({
      cropId: cropProfile.id,
      scenario,
      resolvedByCriterion: input.byCriterion,
      irrigationAvailability: input.request.irrigationAvailability,
      hasIrrigationWaterReport: input.hasIrrigationWaterReport,
    });

    const componentSuitability = this.componentSuitabilityService.build(
      recommendationCode,
      input.cropRecommendationLookup,
    );

    const overall = this.overallService.build({
      hasBlockingBarrier: barrierResult.hasBlockingBarrier,
      blockingBarrierCodes: barrierResult.blockingBarrierCodes,
      componentSuitability,
    });

    const confidence = this.confidenceService.build({
      resolvedInputs: input.resolvedInputs,
      overall,
      hasSoilLabReport: input.hasSoilLabReport,
      hasFieldSurvey: input.hasFieldSurvey,
    });

    const explanation = this.explanationService.build({
      cropName: cropProfile.name,
      catalogCropCode: catalogCode,
      overall,
      barriers: barrierResult.barriers,
      confidence,
    });

    return {
      kind: 'result',
      result: {
        requestedCropCode: input.requestedCode,
        catalogCropCode: catalogCode,
        cropName: cropProfile.name,
        supported: true,
        scenarioCode: scenario.code,
        productionType: scenario.productionType,
        barriers: barrierResult.barriers,
        componentSuitability,
        overall,
        confidence,
        explanation,
        rank: null,
      },
    };
  }

  private async resolveScenario(
    cropId: string,
    productionMode: ProductionModeInput,
    irrigationAvailability: IrrigationAvailabilityInput,
    facade: PhysicalSuitabilityFacade,
  ): Promise<ProductionScenario | null> {
    const scenarios = (await facade.listScenarios(cropId)).filter((s) => s.isActive);
    if (scenarios.length === 0) return null;

    const findByType = (type: ProductionType) => scenarios.find((s) => s.productionType === type);

    if (productionMode === 'rainfed') return findByType('Rainfed') ?? null;
    if (productionMode === 'irrigated') return findByType('Irrigated') ?? null;

    const preferred: ProductionType =
      irrigationAvailability === 'unavailable' ? 'Rainfed' : 'Irrigated';
    return findByType(preferred) ?? scenarios[0] ?? null;
  }

  async getRecord(id: string): Promise<SeasonalAnalysisRecord | null> {
    return this.repository.findById(id);
  }

  async listByParcelKey(parcelKey: string): Promise<SeasonalAnalysisRecord[]> {
    return this.repository.listByParcelKey(parcelKey);
  }
}
