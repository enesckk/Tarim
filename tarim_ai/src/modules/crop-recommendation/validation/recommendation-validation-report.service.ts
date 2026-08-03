import type { RecommendationInputSnapshot } from '../types/recommendation.types.js';
import type { ValidationReport } from './validation.types.js';
import type { CropKnowledgeService } from '../services/crop-knowledge.service.js';
import type { TerrainProfileResponse } from '../../terrain/types/terrain.types.js';
import type { SurfaceAnalysisResponse } from '../../satellite/surface-analysis/surface-analysis.types.js';
import type { LandUsabilityAnalyzeResponse } from '../../land-usability/types/land-usability.types.js';
import { buildTerrainValidationChecks } from '../../terrain/services/terrain-validation.service.js';
import { buildSurfaceValidationChecks } from '../../satellite/surface-analysis/surface-validation.service.js';
import { ScoreCalibrationService } from '../calibration/score-calibration.service.js';

export class RecommendationValidationReportService {
  constructor(
    private readonly cropKnowledgeService: CropKnowledgeService,
    private readonly calibration = new ScoreCalibrationService(),
  ) {}

  build(
    snapshot: RecommendationInputSnapshot,
    terrain?: TerrainProfileResponse | null,
    surface?: SurfaceAnalysisResponse | null,
    landUsability?: LandUsabilityAnalyzeResponse | null,
  ): ValidationReport {
    const crops = this.cropKnowledgeService.listSummaries();
    const climateMock = snapshot.climate.metadata.isMock;
    const soilMock = snapshot.soil.metadata.isMock;
    const soilProvider = String(snapshot.soil.metadata.provider ?? snapshot.soil.provider);

    const criticalGaps: Array<{ code: string; message: string }> = [];
    const actions: Array<{ priority: number; action: string }> = [];

    if (soilMock || soilProvider === 'soilgrids') {
      criticalGaps.push({
        code: 'LAB_SOIL_ANALYSIS_MISSING',
        message:
          'Laboratuvar toprak analizi yoktur; EC, drenaj ve gerçek kök derinliği belirsizdir.',
      });
      actions.push({
        priority: 1,
        action: 'Laboratuvar toprak analizi yaptırılması',
      });
    }

    if (climateMock) {
      criticalGaps.push({
        code: 'CLIMATE_MOCK_DATA',
        message: 'İklim verisi temsili mock kaynaktan gelmektedir.',
      });
    } else if (snapshot.climate.metadata.isEstimated) {
      criticalGaps.push({
        code: 'CLIMATE_GRID_ESTIMATED',
        message:
          'İklim verisi grid tabanlı tahmindir; yerel istasyon doğrulaması önerilir.',
      });
      actions.push({
        priority: 2,
        action: 'Yerel meteoroloji / istasyon verisi ile iklim doğrulaması',
      });
    }

    if (crops.crops.every((c) => c.reviewStatus === 'development')) {
      criticalGaps.push({
        code: 'KNOWLEDGE_UNREVIEWED',
        message: 'Ürün bilgi tabanı henüz development aşamasındadır.',
      });
      actions.push({
        priority: 3,
        action: 'Ürün knowledge kurallarının ziraat mühendisi tarafından gözden geçirilmesi',
      });
    }

    criticalGaps.push({
      code: 'CALIBRATION_UNVALIDATED',
      message: 'Skor kalibrasyonu saha verisiyle doğrulanmamıştır.',
    });
    actions.push({
      priority: 4,
      action: 'Saha gözlemleriyle skor kalibrasyonunun güncellenmesi',
    });

    const terrainChecks = terrain
      ? buildTerrainValidationChecks(terrain, this.calibration.getProfile())
      : undefined;

    if (terrainChecks && terrain) {
      for (const check of terrainChecks) {
        if (check.status === 'failed' || check.status === 'warning') {
          if (
            check.code === 'TERRAIN_CALIBRATION_UNVALIDATED' ||
            check.code === 'TERRAIN_PROVIDER_AVAILABLE' ||
            check.code === 'DEM_COVERAGE_SUFFICIENT' ||
            check.code === 'DEM_SAMPLE_COUNT_SUFFICIENT'
          ) {
            criticalGaps.push({
              code: check.code,
              message: check.message,
            });
          }
        }
      }
      if (terrain.metadata.isMock || terrain.metadata.fallbackUsed) {
        actions.push({
          priority: 5,
          action: 'Copernicus DEM GLO-30 erişiminin yapılandırılması',
        });
      }
    } else {
      criticalGaps.push({
        code: 'TERRAIN_PROVIDER_AVAILABLE',
        message: 'Terrain profili bu raporda değerlendirilmedi.',
      });
    }

    const surfaceChecks = surface
      ? buildSurfaceValidationChecks(surface, this.calibration.getProfile())
      : undefined;

    if (surfaceChecks && surface) {
      for (const check of surfaceChecks) {
        if (
          check.status === 'failed' ||
          check.status === 'warning' ||
          check.status === 'informational'
        ) {
          if (
            check.code === 'SURFACE_TIME_SERIES_SUFFICIENT' ||
            check.code === 'SURFACE_SEASON_COVERAGE' ||
            check.code === 'SURFACE_CALIBRATION_UNVALIDATED' ||
            check.code === 'PROBABLE_ROCK_SIGNAL_INFORMATIVE'
          ) {
            if (check.status !== 'informational') {
              criticalGaps.push({
                code: check.code,
                message: check.message,
              });
            }
          }
        }
      }
      if (surface.dataQuality.confidence === 'low') {
        actions.push({
          priority: 6,
          action: 'Sentinel zaman serisi kapsamının (mevsim / acquisition) iyileştirilmesi',
        });
      }
    }

    const landUsabilityChecks = landUsability?.validation.checks;

    if (landUsabilityChecks) {
      for (const check of landUsabilityChecks) {
        if (
          check.status === 'failed' ||
          check.status === 'warning'
        ) {
          if (
            check.code === 'LAND_USABILITY_REAL_TERRAIN_AVAILABLE' ||
            check.code === 'ROOTABLE_SOIL_DEPTH_VERIFIED' ||
            check.code === 'LAND_USABILITY_CALIBRATION_UNVALIDATED' ||
            check.code === 'PROBABLE_ROCK_REQUIRES_FIELD_CONFIRMATION'
          ) {
            criticalGaps.push({
              code: check.code,
              message: check.message,
            });
          }
        }
      }
      actions.push({
        priority: 7,
        action: 'Land usability saha doğrulama gereksinimlerinin tamamlanması',
      });
    }

    const uniqueGaps = dedupeGaps(criticalGaps);
    const uniqueActions = dedupeActions(actions);

    let overallStatus: ValidationReport['overallStatus'] = 'needs_review';
    if (climateMock && soilMock) {
      overallStatus = 'insufficient_data';
    } else if (
      !climateMock &&
      !soilMock &&
      snapshot.soil.soil.electricalConductivityDsM != null &&
      snapshot.soil.soil.drainage !== 'unknown'
    ) {
      overallStatus = 'ready_for_preliminary_use';
    }

    return {
      overallStatus,
      dataReadiness: {
        parcel: snapshot.parcel ? 'available' : 'geometry_only',
        sentinel: snapshot.analysis.interpretation.confidence,
        climate: climateMock
          ? 'mock'
          : snapshot.climate.confidence === 'high'
            ? 'estimated_high_completeness'
            : 'estimated_partial',
        soil: soilMock
          ? 'mock'
          : soilProvider === 'soilgrids'
            ? 'estimated_partial'
            : 'available',
        ...(terrain
          ? {
              terrain: terrain.metadata.isMock
                ? 'mock'
                : terrain.metadata.spatialConfidence === 'high'
                  ? 'estimated_high_completeness'
                  : 'estimated_partial',
            }
          : {}),
        ...(surface
          ? {
              surface:
                surface.dataQuality.confidence === 'high'
                  ? 'estimated_high_completeness'
                  : surface.dataQuality.confidence === 'medium'
                    ? 'estimated_partial'
                    : 'insufficient',
            }
          : {}),
        ...(landUsability
          ? {
              landUsability: landUsability.landUsability.confidence,
            }
          : {}),
      },
      modelReadiness: {
        cropCount: crops.count,
        knowledgeReviewStatus: 'development',
        calibrationStatus: 'uncalibrated',
        fieldValidationAvailable: false,
      },
      criticalGaps: uniqueGaps,
      recommendedNextActions: uniqueActions,
      disclaimer:
        'Bu rapor ön değerlendirme amaçlıdır. Kesin tarımsal karar, verim garantisi veya tek başına yönetim önerisi olarak kullanılmamalıdır.',
      ...(terrainChecks ? { terrainChecks } : {}),
      ...(surfaceChecks ? { surfaceChecks } : {}),
      ...(landUsabilityChecks ? { landUsabilityChecks } : {}),
    };
  }
}

function dedupeGaps(
  gaps: Array<{ code: string; message: string }>,
): Array<{ code: string; message: string }> {
  const seen = new Set<string>();
  return gaps.filter((gap) => {
    if (seen.has(gap.code)) return false;
    seen.add(gap.code);
    return true;
  });
}

function dedupeActions(
  actions: Array<{ priority: number; action: string }>,
): Array<{ priority: number; action: string }> {
  const seen = new Set<string>();
  return actions
    .sort((a, b) => a.priority - b.priority)
    .filter((action) => {
      if (seen.has(action.action)) return false;
      seen.add(action.action);
      return true;
    });
}
