import { createHash } from 'node:crypto';
import type { GeoJsonInput, NormalizedGeometry } from '../../../types/geojson.types.js';
import type { ParcelQueryService } from '../../parcel/services/parcel-query.service.js';
import type { ParcelQuery, ResolvedParcel } from '../../parcel/types/parcel.types.js';
import { normalizeGeoJsonGeometry, getPolygonAreaSqMeters } from '../../../utils/geometry.utils.js';
import { ApiError } from '../../../utils/api-error.js';
import { ParcelCentroidService } from '../../environment/shared/services/parcel-centroid.service.js';
import type { TerrainProvider } from '../providers/terrain-provider.interface.js';
import type { TerrainProfileResponse } from '../types/terrain.types.js';
import { ElevationAnalysisService } from './elevation-analysis.service.js';
import { SlopeAnalysisService } from './slope-analysis.service.js';
import { AspectAnalysisService } from './aspect-analysis.service.js';
import { RuggednessAnalysisService } from './ruggedness-analysis.service.js';
import { MechanizationAssessmentService } from './mechanization-assessment.service.js';
import { TerrainConfidenceService } from './terrain-confidence.service.js';
import { TerrainNormalizationService } from './terrain-normalization.service.js';
import {
  buildCoverageSummary,
  buildMechanizationSuitabilitySummary,
  classifyTerrainVariability,
} from './terrain-coverage.service.js';
import { buildTerrainValidationChecks } from './terrain-validation.service.js';
import { ScoreCalibrationService } from '../../crop-recommendation/calibration/score-calibration.service.js';
import { resolveTerrainCalibration } from '../config/terrain-calibration.js';
import { round3 } from '../utils/terrain-stats.utils.js';

export interface TerrainProfileRequest {
  geometry?: GeoJsonInput;
  parcelQuery?: ParcelQuery;
  resolved?: {
    geometry: NormalizedGeometry;
    parcel?: ResolvedParcel | null;
  };
  options?: {
    provider?: string;
    dataset?: string;
    resolutionMeters?: number;
  };
}

function geometryHash(geometry: NormalizedGeometry): string {
  return createHash('sha256')
    .update(JSON.stringify(geometry))
    .digest('hex')
    .slice(0, 16);
}

export class TerrainProfileService {
  private readonly cache = new Map<string, { value: TerrainProfileResponse; expiresAt: number }>();

  constructor(
    private readonly provider: TerrainProvider,
    private readonly parcelQueryService: ParcelQueryService,
    private readonly centroidService = new ParcelCentroidService(),
    private readonly elevationAnalysis = new ElevationAnalysisService(),
    private readonly slopeAnalysis = new SlopeAnalysisService(),
    private readonly aspectAnalysis = new AspectAnalysisService(),
    private readonly ruggednessAnalysis = new RuggednessAnalysisService(),
    private readonly mechanizationAssessment = new MechanizationAssessmentService(),
    private readonly confidenceService = new TerrainConfidenceService(),
    private readonly normalization = new TerrainNormalizationService(),
    private readonly calibration = new ScoreCalibrationService(),
  ) {}

  async getProfile(request: TerrainProfileRequest): Promise<TerrainProfileResponse> {
    const { geometry, parcel } = await this.resolve(request);
    const centroid = this.centroidService.fromGeometry(geometry);
    const areaSquareMeters = getPolygonAreaSqMeters(geometry);

    if (areaSquareMeters < 1) {
      throw new ApiError(422, 'Parsel alanı terrain analizi için çok küçük.');
    }

    const terrainCalibration = resolveTerrainCalibration(
      this.calibration.getProfile().terrain,
    );
    const calibVersion = this.calibration.getProfile().version;
    const dataset =
      request.options?.dataset ??
      terrainCalibration.dem?.preferredDataset ??
      'COPERNICUS_30';
    const resolution =
      request.options?.resolutionMeters ??
      terrainCalibration.dem?.requestedResolutionMeters ??
      terrainCalibration.demResolutionMeters;

    const cacheKey = [
      this.provider.name,
      dataset,
      resolution,
      geometryHash(geometry),
      calibVersion,
    ].join('|');

    const ttlMs =
      (terrainCalibration.cache?.ttlSeconds ?? 86_400) * 1000;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.info('[TerrainCache] hit', { cacheKey, provider: this.provider.name });
      return {
        ...cached.value,
        metadata: {
          ...cached.value.metadata,
          cacheHit: true,
          cacheKey,
        },
        audit: cached.value.audit
          ? { ...cached.value.audit, cacheHit: true }
          : cached.value.audit,
      };
    }
    console.info('[TerrainCache] miss', { cacheKey, provider: this.provider.name });

    const demGrid = await this.provider.getDemGrid({
      geometry,
      centroid,
      parcelAreaSquareMeters: areaSquareMeters,
      parcel: parcel
        ? {
            province: parcel.province,
            district: parcel.district,
            neighborhood: parcel.neighborhood,
            block: parcel.block,
            parcel: parcel.parcel,
          }
        : undefined,
    });

    const elevation = this.elevationAnalysis.analyze(demGrid.elevations);
    if (!elevation || elevation.validSampleCount < 1) {
      throw new ApiError(422, 'Terrain analizi için geçerli DEM örneği bulunamadı.');
    }

    const slope = this.slopeAnalysis.analyze(demGrid, terrainCalibration);
    const aspect = this.aspectAnalysis.analyze(demGrid);
    const ruggedness = this.ruggednessAnalysis.analyze(demGrid, terrainCalibration);
    const coverage = buildCoverageSummary({
      grid: demGrid,
      geometry,
      parcelAreaSquareMeters: areaSquareMeters,
      validPixelCount: elevation.validSampleCount,
      calibration: terrainCalibration,
    });

    // Coverage ratio for confidence: prefer parcel-masked valid ratio
    const coverageRatio = coverage.validPixelRatio;

    const spatialConfidence = this.confidenceService.resolve({
      validPixelCount: elevation.validSampleCount,
      coverageRatio,
      isMock: demGrid.isMock,
      calibration: terrainCalibration,
    });

    const mechanization = this.mechanizationAssessment.assess({
      slope,
      ruggedness,
      parcelAreaSquareMeters: areaSquareMeters,
      spatialConfidence,
      calibration: terrainCalibration,
    });

    const usedInDecision =
      !demGrid.isMock &&
      !demGrid.fallbackUsed &&
      !String(demGrid.provider).includes('mock') &&
      (spatialConfidence === 'medium' || spatialConfidence === 'high') &&
      (coverage.coverageStatus === 'complete' ||
        coverage.coverageStatus === 'adequate' ||
        coverage.coverageStatus === 'partial');

    const limitations = [
      ...new Set([
        ...demGrid.limitations,
        'Arazi profili uzaktan DEM tahminidir; saha ölçümü yerine geçmez.',
        'Mekanizasyon sonucu yol erişimi ve gerçek makine geçişini içermez.',
        'Terrain verisi bu sürümde ürün skorlarını değiştirmez.',
        'Terrain verisi kaya yüzdesi, jeoloji veya toprak derinliği üretmez.',
      ]),
    ];

    if (elevation.validSampleCount < terrainCalibration.minimumDemPixels.lowConfidence) {
      limitations.push('Geçerli DEM örnek sayısı düşüktür; sonuçlar belirsiz olabilir.');
    }
    if (coverage.coverageStatus === 'insufficient' || coverage.coverageStatus === 'partial') {
      limitations.push(`DEM coverage durumu: ${coverage.coverageStatus}.`);
    }

    const datasetName =
      String(demGrid.metadata.dataset ?? demGrid.metadata.demInstance ?? dataset);

    const response: TerrainProfileResponse = {
      parcel: {
        title: parcel?.title ?? null,
        areaSquareMeters: parcel?.areaSquareMeters ?? areaSquareMeters,
        landType: parcel?.landType ?? null,
        geometryType: geometry.type,
      },
      terrain: {
        elevation,
        slope,
        aspect,
        ruggedness,
        mechanization,
        coverage,
        terrainVariability: classifyTerrainVariability({
          elevation,
          slope,
          ruggedness,
        }),
        terrainMechanizationSuitability:
          buildMechanizationSuitabilitySummary(mechanization),
        provider: {
          name: demGrid.provider,
          dataset: demGrid.isMock ? null : datasetName,
          isMock: demGrid.isMock,
          fallbackUsed: demGrid.fallbackUsed,
          requestedResolutionMeters:
            Number(demGrid.metadata.requestedResolutionMeters ?? resolution),
          effectiveResolutionMeters:
            Number(
              demGrid.metadata.effectiveResolutionMeters ??
                demGrid.resolutionMeters ??
                resolution,
            ),
        },
      },
      metadata: {
        provider: demGrid.provider,
        providerMode: String(demGrid.metadata.providerMode ?? demGrid.provider),
        resolutionMeters: demGrid.resolutionMeters,
        parcelAreaSquareMeters: round3(areaSquareMeters),
        validPixelCount: elevation.validSampleCount,
        coverageRatio,
        spatialConfidence,
        isEstimated: demGrid.isEstimated,
        isMock: demGrid.isMock,
        fallbackUsed: demGrid.fallbackUsed,
        generatedAt: new Date().toISOString(),
        providerStatus: demGrid.providerStatus,
        dataset: demGrid.isMock ? undefined : datasetName,
        requestedResolutionMeters: Number(
          demGrid.metadata.requestedResolutionMeters ?? resolution,
        ),
        effectiveResolutionMeters: Number(
          demGrid.metadata.effectiveResolutionMeters ?? demGrid.resolutionMeters,
        ),
        cacheHit: false,
        cacheKey,
        usedInDecision,
      },
      limitations,
      confidence: spatialConfidence,
    };

    const normalized = this.normalization.normalize(response);
    const checks = buildTerrainValidationChecks(normalized, this.calibration.getProfile());
    const withValidation: TerrainProfileResponse = {
      ...normalized,
      validation: { checks },
      audit: {
        provider: demGrid.provider,
        dataset: demGrid.isMock ? null : datasetName,
        isMock: demGrid.isMock,
        fallbackUsed: demGrid.fallbackUsed,
        cacheHit: false,
        coverageStatus: coverage.coverageStatus,
        spatialConfidence,
        calibrationVersion: calibVersion,
      },
      confidence: spatialConfidence,
    };

    this.cache.set(cacheKey, {
      value: withValidation,
      expiresAt: Date.now() + ttlMs,
    });
    return withValidation;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async resolve(request: TerrainProfileRequest): Promise<{
    geometry: NormalizedGeometry;
    parcel: ResolvedParcel | null;
  }> {
    if (request.resolved) {
      return {
        geometry: request.resolved.geometry,
        parcel: request.resolved.parcel ?? null,
      };
    }

    if (request.geometry && request.parcelQuery) {
      throw new ApiError(400, 'Provide either geometry or parcelQuery, not both');
    }
    if (!request.geometry && !request.parcelQuery) {
      throw new ApiError(400, 'Either geometry or parcelQuery is required');
    }

    if (request.parcelQuery) {
      const resolved = await this.parcelQueryService.resolve(request.parcelQuery);
      return {
        geometry: resolved.parcel.geometry,
        parcel: resolved.parcel,
      };
    }

    try {
      return {
        geometry: normalizeGeoJsonGeometry(request.geometry!),
        parcel: null,
      };
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 400) {
        throw new ApiError(422, 'Parsel geometrisi geçersiz.', error.details);
      }
      throw error;
    }
  }
}
