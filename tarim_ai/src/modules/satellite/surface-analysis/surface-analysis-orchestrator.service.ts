import type { ConfidenceLevel } from '../../../utils/trend.utils.js';
import type { TimeSeriesResponse } from '../../../services/time-series.service.js';
import type { GeoJsonInput, NormalizedGeometry } from '../../../types/geojson.types.js';
import type { ParcelQuery } from '../../parcel/types/parcel.types.js';
import type { ParcelQueryService } from '../../parcel/services/parcel-query.service.js';
import { normalizeGeoJsonGeometry } from '../../../utils/geometry.utils.js';
import { ApiError } from '../../../utils/api-error.js';
import { timeSeriesService } from '../../../services/time-series.service.js';
import { ScoreCalibrationService } from '../../crop-recommendation/calibration/score-calibration.service.js';
import { resolveSurfaceCalibration } from './surface-calibration.js';
import { extractSuccessfulObservations, meanOf, round3 } from './observation.utils.js';
import { SurfacePersistenceService } from './surface-persistence.service.js';
import { SeasonalVegetationService } from './seasonal-vegetation.service.js';
import { AgriculturalCycleService } from './agricultural-cycle.service.js';
import { ContinuousBareSurfaceService } from './continuous-bare-surface.service.js';
import { ProbableRockSignalService } from './probable-rock-signal.service.js';
import type {
  SeasonName,
  SurfaceAnalysisResponse,
  SurfaceDataQuality,
} from './surface-analysis.types.js';

export interface SurfaceAnalysisRequest {
  geometry?: GeoJsonInput;
  parcelQuery?: ParcelQuery;
  months: number;
  maxCloudCoverage: number;
}

interface CachedTimeSeries {
  expiresAt: number;
  value: TimeSeriesResponse;
}

/** Short TTL cache so surface-analysis and surface-persistence share one Process API pull. */
const TIME_SERIES_CACHE_TTL_MS = 10 * 60 * 1000;
const timeSeriesCache = new Map<string, CachedTimeSeries>();

export class SurfaceAnalysisOrchestratorService {
  constructor(
    private readonly parcelQueryService?: ParcelQueryService,
    private readonly seriesService: {
      computeTimeSeries: (request: {
        geometry: NormalizedGeometry;
        months: number;
        maxCloudCoverage: number;
      }) => Promise<TimeSeriesResponse>;
    } = timeSeriesService,
    private readonly calibration = new ScoreCalibrationService(),
    private readonly persistenceService = new SurfacePersistenceService(),
    private readonly seasonalService = new SeasonalVegetationService(),
    private readonly cycleService = new AgriculturalCycleService(),
    private readonly bareService = new ContinuousBareSurfaceService(),
    private readonly rockService = new ProbableRockSignalService(),
  ) {}

  async analyze(request: SurfaceAnalysisRequest): Promise<SurfaceAnalysisResponse> {
    const geometry = await this.resolveGeometry(request);
    const cacheKey = buildTimeSeriesCacheKey(
      geometry,
      request.months,
      request.maxCloudCoverage,
    );
    const cached = timeSeriesCache.get(cacheKey);
    let timeSeries: TimeSeriesResponse;
    if (cached && cached.expiresAt > Date.now()) {
      timeSeries = cached.value;
    } else {
      timeSeries = await this.seriesService.computeTimeSeries({
        geometry,
        months: request.months,
        maxCloudCoverage: request.maxCloudCoverage,
      });
      timeSeriesCache.set(cacheKey, {
        value: timeSeries,
        expiresAt: Date.now() + TIME_SERIES_CACHE_TTL_MS,
      });
    }
    return this.analyzeFromTimeSeries(timeSeries);
  }

  analyzeFromTimeSeries(timeSeries: TimeSeriesResponse): SurfaceAnalysisResponse {
    const calibration = resolveSurfaceCalibration(this.calibration.getProfile().surface);
    const observations = extractSuccessfulObservations(timeSeries);
    const dataQuality = this.buildDataQuality(timeSeries, observations.length, calibration);

    const surfacePersistence = this.persistenceService.analyze(observations, calibration);
    const seasonalVegetation = this.seasonalService.analyze(observations, calibration);
    const continuousBareSurface = this.bareService.analyze(
      observations,
      surfacePersistence,
      calibration,
    );
    const agriculturalCycle = this.cycleService.analyze({
      observations,
      seasonal: seasonalVegetation,
      persistence: surfacePersistence,
      calibration,
      dataConfidence: dataQuality.confidence,
    });
    const probableRockOrShallowSoil = this.rockService.analyze({
      observations,
      persistence: surfacePersistence,
      seasonal: seasonalVegetation,
      bare: continuousBareSurface,
      calibration,
      agriculturalCycleSignal: agriculturalCycle.signal,
    });

    const limitations = [
      ...new Set([
        ...dataQuality.limitations,
        'Yüzey analizi Sentinel-2 indeks zaman serisine dayanır; saha gözleminin yerini tutmaz.',
        'Muhtemel kayalık / sığ toprak sinyali kesin sınıflandırma değildir.',
        'Bu sürümde yüzey analizi ürün skorlarını veya senaryo sıralamasını değiştirmez.',
      ]),
    ];

    const rulesApplied = [
      'low_ndvi_share',
      'high_bsi_share',
      'seasonal_ndvi_amplitude',
      'continuous_bare_run',
      'probable_rock_composite_score',
    ];

    return {
      period: timeSeries.period,
      dataQuality,
      surfacePersistence,
      seasonalVegetation,
      agriculturalCycle,
      continuousBareSurface,
      probableRockOrShallowSoil,
      audit: {
        modelVersion: '1.3',
        calibrationVersion: this.calibration.getProfile().version,
        inputsUsed: ['sentinel-2-time-series', 'ndvi', 'ndmi', 'bsi'],
        rulesApplied,
        evidenceSummary: [
          ...surfacePersistence.messages.slice(0, 1),
          ...seasonalVegetation.messages.slice(0, 1),
          ...agriculturalCycle.messages.slice(0, 1),
          probableRockOrShallowSoil.disclaimer,
        ],
        notes: [
          'Deterministik kural tabanlı yüzey analizi.',
          `Surface calibration: ${calibration.source} (${calibration.validationStatus}).`,
        ],
      },
      limitations,
      sourceTimeSeries: {
        successfulAcquisitionCount: timeSeries.summary.successfulAcquisitionCount,
        ndviMean: meanOf(observations.map((o) => o.ndviMean)),
        ndmiMean: meanOf(observations.map((o) => o.ndmiMean)),
        bsiMean: meanOf(observations.map((o) => o.bsiMean)),
        trends: timeSeries.trends,
      },
    };
  }

  private buildDataQuality(
    timeSeries: TimeSeriesResponse,
    successfulCount: number,
    calibration: ReturnType<typeof resolveSurfaceCalibration>,
  ): SurfaceDataQuality {
    const successful = timeSeries.series.filter((p) => p.status === 'success');
    const averageValidPixelRatio =
      successful.length === 0
        ? null
        : round3(
            successful.reduce((sum, p) => sum + (p.validPixelRatio ?? 0), 0) /
              successful.length,
          );

    const seasons = new Set(
      extractSuccessfulObservations(timeSeries).map((o) => o.season),
    );
    const seasonsWithObservations = seasons.size;
    const seasonCoverageRatio = round3(seasonsWithObservations / 4);

    const confidence = resolveSurfaceConfidence(
      successfulCount,
      seasonCoverageRatio,
      averageValidPixelRatio,
      calibration,
    );

    const limitations: string[] = [];
    if (successfulCount < calibration.minimumSuccessfulAcquisitions.mediumConfidence) {
      limitations.push('Başarılı Sentinel acquisition sayısı sınırlıdır.');
    }
    if (seasonCoverageRatio < calibration.minimumSeasonCoverageRatio.mediumConfidence) {
      limitations.push('Mevsim kapsamı eksiktir; sonuçlar belirsiz olabilir.');
    }
    if ((averageValidPixelRatio ?? 0) < 0.25) {
      limitations.push('Ortalama geçerli piksel oranı düşüktür.');
    }

    return {
      successfulAcquisitionCount: successfulCount,
      selectedAcquisitionCount: timeSeries.summary.selectedAcquisitionCount,
      failedAcquisitionCount: timeSeries.summary.failedAcquisitionCount,
      averageValidPixelRatio,
      seasonsWithObservations,
      seasonCoverageRatio,
      confidence,
      limitations,
    };
  }

  private async resolveGeometry(
    request: SurfaceAnalysisRequest,
  ): Promise<NormalizedGeometry> {
    if (request.geometry && request.parcelQuery) {
      throw new ApiError(400, 'Provide either geometry or parcelQuery, not both');
    }
    if (!request.geometry && !request.parcelQuery) {
      throw new ApiError(400, 'Either geometry or parcelQuery is required');
    }
    if (request.parcelQuery) {
      if (!this.parcelQueryService) {
        throw new ApiError(500, 'Parcel query service is not configured for surface analysis');
      }
      const resolved = await this.parcelQueryService.resolve(request.parcelQuery);
      return resolved.parcel.geometry;
    }
    try {
      return normalizeGeoJsonGeometry(request.geometry!);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 400) {
        throw new ApiError(422, 'Parsel geometrisi geçersiz.', error.details);
      }
      throw error;
    }
  }
}

export function resolveSurfaceConfidence(
  successfulCount: number,
  seasonCoverageRatio: number,
  averageValidPixelRatio: number | null,
  calibration: ReturnType<typeof resolveSurfaceCalibration>,
): ConfidenceLevel {
  const acq = calibration.minimumSuccessfulAcquisitions;
  const season = calibration.minimumSeasonCoverageRatio;
  const valid = averageValidPixelRatio ?? 0;

  let byAcq: ConfidenceLevel = 'low';
  if (successfulCount >= acq.highConfidence) byAcq = 'high';
  else if (successfulCount >= acq.mediumConfidence) byAcq = 'medium';
  else if (successfulCount >= acq.lowConfidence) byAcq = 'low';

  let bySeason: ConfidenceLevel = 'low';
  if (seasonCoverageRatio >= season.highConfidence) bySeason = 'high';
  else if (seasonCoverageRatio >= season.mediumConfidence) bySeason = 'medium';

  let byValid: ConfidenceLevel = 'low';
  if (valid >= 0.4) byValid = 'high';
  else if (valid >= 0.25) byValid = 'medium';

  const rank = { low: 1, medium: 2, high: 3 } as const;
  const minRank = Math.min(rank[byAcq], rank[bySeason], rank[byValid]);
  if (minRank >= 3) return 'high';
  if (minRank >= 2) return 'medium';
  return 'low';
}

export function seasonsPresent(observations: { season: SeasonName }[]): number {
  return new Set(observations.map((o) => o.season)).size;
}

function buildTimeSeriesCacheKey(
  geometry: NormalizedGeometry,
  months: number,
  maxCloudCoverage: number,
): string {
  return JSON.stringify({
    type: geometry.type,
    coordinates: geometry.coordinates,
    months,
    maxCloudCoverage,
  });
}

/** Test helper: clear shared Process API response cache. */
export function clearSurfaceTimeSeriesCache(): void {
  timeSeriesCache.clear();
}
