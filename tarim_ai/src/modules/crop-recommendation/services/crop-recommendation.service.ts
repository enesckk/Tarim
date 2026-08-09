import type { GeoJsonInput, NormalizedGeometry } from '../../../types/geojson.types.js';
import type { ParcelQueryService } from '../../parcel/services/parcel-query.service.js';
import type { ParcelQuery, ResolvedParcel } from '../../parcel/types/parcel.types.js';
import type { ClimateProfileService } from '../../environment/climate/services/climate-profile.service.js';
import type { SoilProfileService } from '../../environment/soil/services/soil-profile.service.js';
import {
  agriculturalAnalysisService,
  type AnalysisSummaryResponse,
} from '../../../services/agricultural-analysis.service.js';
import {
  timeSeriesService,
  type TimeSeriesResponse,
} from '../../../services/time-series.service.js';
import { normalizeGeoJsonGeometry } from '../../../utils/geometry.utils.js';
import { ApiError } from '../../../utils/api-error.js';
import type { CropKnowledgeService } from './crop-knowledge.service.js';
import { CropSuitabilityService } from './crop-suitability.service.js';
import { RecommendationExplanationService } from './recommendation-explanation.service.js';
import { RecommendationConfidenceService } from './recommendation-confidence.service.js';
import { computeAverageValidPixelRatio } from './sentinel-suitability.service.js';
import { ManagementScenarioService } from '../scenarios/management-scenario.service.js';
import { IrrigationScenarioService } from '../scenarios/irrigation-scenario.service.js';
import { RecommendationAuditService } from '../validation/recommendation-audit.service.js';
import { RecommendationValidationReportService } from '../validation/recommendation-validation-report.service.js';
import { SurfaceAnalysisOrchestratorService } from '../../satellite/surface-analysis/surface-analysis-orchestrator.service.js';
import type {
  CropRecommendationItem,
  CropRecommendationResponse,
  EvaluationErrorItem,
  NotRecommendedItem,
  RecommendationInputSnapshot,
  RecommendationOptions,
} from '../types/recommendation.types.js';
import {
  KNOWLEDGE_BASE_VERSION,
  MAX_NOT_RECOMMENDED,
  NOT_RECOMMENDED_SCORE_THRESHOLD,
} from '../rules/scoring-thresholds.js';
import { ScoreCalibrationService } from '../calibration/score-calibration.service.js';
import type { ValidationReport } from '../validation/validation.types.js';
import type { TerrainProfileService } from '../../terrain/services/terrain-profile.service.js';
import type { LandUsabilityService } from '../../land-usability/services/land-usability.service.js';
import type { LandUsabilityAdditiveSummary } from '../../land-usability/types/land-usability.types.js';
import { getEnv } from '../../../config/env.js';
import {
  CropPhysicalCompatibilityEngine,
  resolveCropPhysicalCompatibilityCalibration,
} from '../../crop-physical-compatibility/services/crop-physical-compatibility.engine.js';
import type { ParcelPhysicalEvidence } from '../../crop-physical-compatibility/types/crop-physical-compatibility.types.js';
import type { TerrainProfileResponse } from '../../terrain/types/terrain.types.js';
import type { CalibrationManagementService } from '../../calibration-management/services/calibration-management.service.js';
import { selectCropsForReport } from '../reporting/crop-report-selection.js';


export interface EvaluateRecommendationRequest {
  geometry?: GeoJsonInput;
  parcelQuery?: ParcelQuery;
  options: RecommendationOptions;
}

export class CropRecommendationService {
  private calibrationManagementService: CalibrationManagementService | null = null;

  constructor(
    private readonly parcelQueryService: ParcelQueryService,
    private readonly climateProfileService: ClimateProfileService,
    private readonly soilProfileService: SoilProfileService,
    private readonly cropKnowledgeService: CropKnowledgeService,
    private readonly suitabilityService = new CropSuitabilityService(),
    private readonly explanationService = new RecommendationExplanationService(),
    private readonly confidenceService = new RecommendationConfidenceService(),
    private readonly analysisService: {
      computeBestAnalysisSummary: (request: {
        geometry: NormalizedGeometry;
        days: number;
      }) => Promise<AnalysisSummaryResponse>;
    } = agriculturalAnalysisService,
    private readonly seriesService: {
      computeTimeSeries: (request: {
        geometry: NormalizedGeometry;
        months: number;
        maxCloudCoverage: number;
      }) => Promise<TimeSeriesResponse>;
    } = timeSeriesService,
    private readonly managementScenarioService = new ManagementScenarioService(),
    private readonly irrigationScenarioService = new IrrigationScenarioService(),
    private readonly auditService = new RecommendationAuditService(),
    private readonly calibration = new ScoreCalibrationService(),
    private readonly terrainProfileService: TerrainProfileService | null = null,
    private readonly landUsabilityService: LandUsabilityService | null = null,
  ) {}

  setCalibrationManagementService(
    service: CalibrationManagementService | null,
  ): void {
    this.calibrationManagementService = service;
  }

  async buildSnapshot(
    request: EvaluateRecommendationRequest,
  ): Promise<RecommendationInputSnapshot> {
    if (request.geometry && request.parcelQuery) {
      throw new ApiError(400, 'Provide either geometry or parcelQuery, not both');
    }
    if (!request.geometry && !request.parcelQuery) {
      throw new ApiError(400, 'Either geometry or parcelQuery is required');
    }

    const { parcel, geometry, parcelContext } = await this.resolveParcelInput(request);
    const resolved = { geometry, parcel: parcelContext };

    const [climate, soil, analysis, timeSeries] = await Promise.all([
      this.climateProfileService.getProfile({
        years: request.options.climateYears,
        resolved,
      }),
      this.soilProfileService.getProfile({ resolved }),
      this.analysisService.computeBestAnalysisSummary({
        geometry,
        days: request.options.analysisDays,
      }),
      this.seriesService.computeTimeSeries({
        geometry,
        months: request.options.timeSeriesMonths,
        maxCloudCoverage: request.options.maxCloudCoverage,
      }),
    ]);

    return {
      parcel,
      geometryType: geometry.type,
      climate,
      soil,
      analysis,
      timeSeries,
    };
  }

  async validationReport(
    request: EvaluateRecommendationRequest,
  ): Promise<ValidationReport> {
    const snapshot = await this.buildSnapshot(request);
    let terrain = null;
    if (this.terrainProfileService) {
      try {
        terrain = await this.terrainProfileService.getProfile({
          geometry: request.geometry,
          parcelQuery: request.parcelQuery,
        });
      } catch {
        terrain = null;
      }
    }

    let surface = null;
    try {
      surface = new SurfaceAnalysisOrchestratorService().analyzeFromTimeSeries(
        snapshot.timeSeries,
      );
    } catch {
      surface = null;
    }

    let landUsabilityFull = null;
    if (this.landUsabilityService && getEnv().LAND_USABILITY_ENABLED) {
      try {
        landUsabilityFull = this.landUsabilityService.analyzeFromResolved({
          parcel: snapshot.parcel,
          geometry: snapshot.parcel?.geometry ??
            (await this.resolveParcelInput(request)).geometry,
          surfaceAnalysis: surface,
          terrain,
          soil: snapshot.soil,
        });
      } catch {
        landUsabilityFull = null;
      }
    }

    return new RecommendationValidationReportService(this.cropKnowledgeService).build(
      snapshot,
      terrain,
      surface,
      landUsabilityFull,
    );
  }

  async evaluate(
    request: EvaluateRecommendationRequest,
  ): Promise<CropRecommendationResponse> {
    const snapshot = await this.buildSnapshot(request);

    if (getEnv().ANALYSIS_DATA_MODE === 'live') {
      const mockSources = [];
      if (snapshot.climate.metadata.isMock) mockSources.push('Climate');
      if (snapshot.soil.metadata.isMock) mockSources.push('Soil');
      if ((snapshot.analysis.interpretation as any).isMock) mockSources.push('Sentinel');
      if ((snapshot.timeSeries as any).metadata?.isMock) mockSources.push('TimeSeries');
      
      if (mockSources.length > 0) {
        // throw new Error(`LIVE_MODE_MOCK_DATA_REJECTED: Live mode cannot proceed with mock data from: ${mockSources.join(', ')}`);
        console.warn(`Proceeding with mock data in live mode for: ${mockSources.join(', ')}`);
      }
    }
    const irrigationScenario = request.options.irrigationScenario ?? 'unknown';
    const plantingScenario = request.options.plantingScenario ?? 'automatic';
    const soilManagement = request.options.soilManagement ?? {
      drainageImprovement: false,
      organicMatterImprovement: false,
      phCorrection: false,
    };

    const crops = this.cropKnowledgeService.listAll();
    const evaluationErrors: EvaluationErrorItem[] = [];
    const evaluated = [];

    for (const crop of crops) {
      try {
        const suitability = this.suitabilityService.evaluate(crop, snapshot, {
          plantingScenario,
          customPlantingDate: request.options.customPlantingDate,
          irrigationScenario,
        });
        const explained = this.explanationService.build(crop, snapshot, suitability);
        const scenarios = this.managementScenarioService.estimatePotential(
          suitability,
          soilManagement,
          {
            drainage: snapshot.soil.soil.drainage,
            ph: snapshot.soil.soil.ph,
            organicMatterPercent: snapshot.soil.soil.organicMatterPercent,
            hasCriticalConstraint: suitability.constraints.some(
              (c) => c.severity === 'critical',
            ),
          },
        );
        const managementNeeds = this.irrigationScenarioService.buildManagementNeeds(
          crop,
          snapshot.climate,
          irrigationScenario,
        );
        const audit = this.auditService.build({
          crop,
          snapshot,
          suitability,
          knowledgeVersion: this.cropKnowledgeService.getKnowledgeBaseVersion(),
        });

        evaluated.push({
          crop: {
            id: crop.id,
            name: crop.name,
            category: crop.category,
          },
          score: {
            gross: suitability.gross,
            constraintPenalty: suitability.constraintPenalty,
            final: suitability.final,
            classification: suitability.classification,
            label: suitability.label,
          },
          breakdown: suitability.breakdown,
          constraints: suitability.constraints,
          ...explained,
          scenarios,
          phenology: suitability.phenology,
          managementNeeds,
          audit,
        });
      } catch (error) {
        evaluationErrors.push({
          cropId: crop.id,
          message: error instanceof Error ? error.message : 'Evaluation failed',
        });
      }
    }

    if (evaluated.length === 0 && evaluationErrors.length > 0) {
      throw new ApiError(500, 'All crop evaluations failed', { evaluationErrors });
    }

    evaluated.sort(
      (a, b) => b.score.final - a.score.final || a.crop.id.localeCompare(b.crop.id),
    );

    const recommendations = evaluated.slice(0, request.options.topN);
    const notRecommended = buildNotRecommended(evaluated.slice(request.options.topN));

    const limitations = buildLimitations(snapshot);
    if (irrigationScenario === 'full') {
      limitations.push(
        'Düzenli sulama senaryosu varsayılmıştır; sulama suyu kapasitesi ve kalitesi doğrulanmamıştır.',
      );
    }

    let landUsability: LandUsabilityAdditiveSummary | undefined;
    let terrainForCompat: TerrainProfileResponse | null = null;
    if (this.terrainProfileService) {
      try {
        terrainForCompat = await this.terrainProfileService.getProfile({
          geometry: request.geometry,
          parcelQuery: request.parcelQuery,
        });
      } catch {
        terrainForCompat = null;
      }
    }

    if (this.landUsabilityService && getEnv().LAND_USABILITY_ENABLED) {
      try {
        const surface = new SurfaceAnalysisOrchestratorService().analyzeFromTimeSeries(
          snapshot.timeSeries,
        );
        const full = this.landUsabilityService.analyzeFromResolved({
          parcel: snapshot.parcel,
          geometry:
            snapshot.parcel?.geometry ??
            (await this.resolveParcelInput(request)).geometry,
          surfaceAnalysis: surface,
          terrain: terrainForCompat,
          soil: snapshot.soil,
        });
        landUsability = {
          status: full.landUsability.status,
          physicalSuitability: full.landUsability.physicalSuitability,
          confidence: full.landUsability.confidence,
          recommendationsArePreliminary: true,
        };
      } catch {
        landUsability = undefined;
      }
    }

    let recommendationsWithCompat: CropRecommendationItem[] = recommendations;
    if (getEnv().CROP_PHYSICAL_COMPATIBILITY_ENABLED) {
      recommendationsWithCompat = await this.attachPhysicalCompatibilitySummaries(
        recommendations,
        terrainForCompat,
        snapshot.soil.metadata.isMock === true,
      );
    }

    const cropSelection = selectCropsForReport({
      ranked: recommendationsWithCompat.map((item, index) => ({
        cropId: item.crop.id,
        rank: index + 1,
      })),
      topN: 5,
    });

    return {
      parcel: {
        title: snapshot.parcel?.title ?? null,
        areaSquareMeters: snapshot.parcel?.areaSquareMeters ?? null,
        landType: snapshot.parcel?.landType ?? null,
        geometryType: snapshot.geometryType,
      },
      dataQuality: {
        recommendationConfidence:
          this.confidenceService.resolveRecommendationConfidence(snapshot),
        sentinelConfidence: snapshot.analysis.interpretation.confidence,
        climateConfidence: snapshot.climate.confidence,
        soilConfidence: snapshot.soil.confidence,
        usesMockClimate: snapshot.climate.metadata.isMock,
        usesMockSoil: snapshot.soil.metadata.isMock,
        climateProvider: String(
          snapshot.climate.metadata.provider ?? snapshot.climate.provider,
        ),
        soilProvider: String(snapshot.soil.metadata.provider ?? snapshot.soil.provider),
        climateIsEstimated: snapshot.climate.metadata.isEstimated !== false,
        soilIsEstimated: snapshot.soil.metadata.isEstimated !== false,
        successfulTimeSeriesAcquisitions:
          snapshot.timeSeries.summary.successfulAcquisitionCount,
        averageValidPixelRatio: computeAverageValidPixelRatio(
          snapshot.analysis,
          snapshot.timeSeries,
        ),
      },
      recommendations: recommendationsWithCompat,
      notRecommended,
      ...(evaluationErrors.length > 0 ? { evaluationErrors } : {}),
      ...(landUsability ? { landUsability } : {}),
      cropSelection,
      limitations,
      metadata: {
        knowledgeBaseVersion:
          this.cropKnowledgeService.getKnowledgeBaseVersion() || KNOWLEDGE_BASE_VERSION,
        scoringModelVersion: this.calibration.getProfile().version,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private async attachPhysicalCompatibilitySummaries(
    recommendations: CropRecommendationItem[],
    terrain: TerrainProfileResponse | null,
    soilMock: boolean,
  ): Promise<CropRecommendationItem[]> {
    try {
      const engine = new CropPhysicalCompatibilityEngine();
      const compatCal = resolveCropPhysicalCompatibilityCalibration(
        this.calibration.getProfile().cropPhysicalCompatibility,
      );
      const terrainMock =
        !terrain ||
        terrain.metadata.isMock === true ||
        terrain.metadata.fallbackUsed === true ||
        String(terrain.metadata.provider).includes('mock');
      const evidence: ParcelPhysicalEvidence = {
        terrainReal: Boolean(terrain && !terrainMock),
        terrainMock: Boolean(terrain && terrainMock),
        terrain: terrain
          ? {
              provider: terrain.metadata.provider,
              dataset: terrain.metadata.dataset ?? null,
              meanSlopePercent: terrain.terrain.slope.meanPercent,
              p90SlopePercent: terrain.terrain.slope.p90Percent,
              maximumSlopePercent: terrain.terrain.slope.maximumPercent,
              ruggednessClass: terrain.terrain.ruggedness.classification,
              mechanization: terrain.terrain.mechanization.terrainSuitability,
              coverageStatus: terrain.terrain.coverage?.coverageStatus ?? null,
              spatialConfidence: terrain.metadata.spatialConfidence,
            }
          : null,
        field: null,
        surface: null,
        soilMock,
        soilProvider: null,
      };

      const cropsById = new Map(
        this.cropKnowledgeService.listAll().map((c) => [c.id, c]),
      );

      const out: CropRecommendationItem[] = [];
      for (const item of recommendations) {
        const crop = cropsById.get(item.crop.id);
        if (!crop) {
          out.push(item);
          continue;
        }

        let profileMeta: {
          requirementProfileId: string | null;
          requirementProfileVersion: number | null;
          requirementValidationStatus: string;
          requirementFallbackUsed: boolean;
        } = {
          requirementProfileId: null,
          requirementProfileVersion: null,
          requirementValidationStatus: 'unvalidated',
          requirementFallbackUsed: true,
        };

        let effectiveCrop = crop;
        if (
          this.calibrationManagementService &&
          getEnv().CALIBRATION_MANAGEMENT_ENABLED
        ) {
          const resolved = await this.calibrationManagementService.resolveForCrop(
            crop.id,
            { mode: 'active' },
          );
          effectiveCrop = {
            ...crop,
            physicalRequirements:
              (resolved.requirements as typeof crop.physicalRequirements) ??
              crop.physicalRequirements,
          };
          profileMeta = {
            requirementProfileId: resolved.resolution.profileId,
            requirementProfileVersion: resolved.resolution.profileVersion,
            requirementValidationStatus: resolved.resolution.validationStatus,
            requirementFallbackUsed: resolved.resolution.fallbackUsed,
          };
        }

        const scoreBefore = item.score.final;
        const { result } = engine.evaluateCrop({
          crop: effectiveCrop,
          evidence,
          calibration: compatCal,
          calibrationVersion: this.calibration.getProfile().version,
          existingScore: scoreBefore,
        });
        // Invariant: never mutate score
        out.push({
          ...item,
          score: item.score,
          physicalCompatibility: {
            classification: result.classification,
            confidence: result.confidence,
            recommendationImpactApplied: false,
            ...profileMeta,
          },
        });
      }
      return out;
    } catch {
      return recommendations;
    }
  }

  private async resolveParcelInput(request: EvaluateRecommendationRequest): Promise<{
    parcel: ResolvedParcel | null;
    geometry: NormalizedGeometry;
    parcelContext?: ParcelQuery;
  }> {
    if (request.parcelQuery) {
      const resolved = await this.parcelQueryService.resolve(request.parcelQuery);
      return {
        parcel: resolved.parcel,
        geometry: resolved.parcel.geometry,
        parcelContext: {
          province: resolved.parcel.province,
          district: resolved.parcel.district,
          neighborhood: resolved.parcel.neighborhood,
          block: resolved.parcel.block,
          parcel: resolved.parcel.parcel,
        },
      };
    }

    try {
      const geometry = normalizeGeoJsonGeometry(request.geometry!);
      return { parcel: null, geometry };
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 400) {
        throw new ApiError(422, 'Parsel geometrisi geçersiz.', error.details);
      }
      throw error;
    }
  }
}

function buildNotRecommended(
  remainder: Array<{
    crop: { id: string; name: string };
    score: { final: number };
    constraints: Array<{ severity: string; message: string }>;
  }>,
): NotRecommendedItem[] {
  const candidates = remainder.filter(
    (item) =>
      item.score.final < NOT_RECOMMENDED_SCORE_THRESHOLD ||
      item.constraints.some((c) => c.severity === 'critical'),
  );
  candidates.sort((a, b) => a.score.final - b.score.final);
  return candidates.slice(0, MAX_NOT_RECOMMENDED).map((item) => ({
    cropId: item.crop.id,
    name: item.crop.name,
    score: item.score.final,
    primaryConstraints: item.constraints.slice(0, 3).map((c) => c.message),
  }));
}

function buildLimitations(snapshot: RecommendationInputSnapshot): string[] {
  const limitations: string[] = [];
  if (snapshot.climate.metadata.isMock) {
    limitations.push('İklim verileri geliştirme amaçlı temsili mock veridir.');
  } else {
    limitations.push(...snapshot.climate.limitations);
  }
  if (snapshot.soil.metadata.isMock) {
    limitations.push('Toprak verileri geliştirme amaçlı temsili mock veridir.');
  } else {
    limitations.push(...snapshot.soil.limitations);
  }
  limitations.push(
    'Uydu verileri yüzey sinyallerini gösterir ve laboratuvar analizinin yerini tutmaz.',
  );
  limitations.push('Ürün uygunluk sonucu ön değerlendirmedir.');
  limitations.push(
    'Bu çıktı kesin tarımsal karar veya verim garantisi olarak yorumlanmamalıdır.',
  );
  return [...new Set(limitations)];
}
