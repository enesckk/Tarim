import type { NormalizedGeometry } from '../types/geojson.types.js';
import type { SatelliteProduct } from '../types/satellite.types.js';
import { ApiError } from '../utils/api-error.js';
import { mapWithConcurrency } from '../utils/concurrency.utils.js';
import { buildDatetimeRangeMonths } from '../utils/date.utils.js';
import { roundTo4 } from '../utils/statistics.utils.js';
import {
  computeTrend,
  interpretMoistureTrend,
  interpretSoilSurfaceTrend,
  interpretVegetationTrend,
  resolveTimeSeriesConfidence,
  type ConfidenceLevel,
  type TrendStats,
} from '../utils/trend.utils.js';
import { copernicusCatalogService } from './copernicus-catalog.service.js';
import { indexStatisticsService } from './index-statistics.service.js';
import { selectTimeSeriesAcquisitions } from './time-series-selection.service.js';

const PROCESS_CONCURRENCY = 3;

export interface TimeSeriesRequest {
  geometry: NormalizedGeometry;
  months: number;
  maxCloudCoverage: number;
}

export interface TimeSeriesPointIndices {
  ndviMean: number;
  ndmiMean: number;
  bsiMean: number;
}

export interface TimeSeriesPoint {
  productId: string;
  datetime: string;
  satellite: string;
  tile: string | null;
  cloudCoverage: number | null;
  validPixelRatio: number | null;
  indices: TimeSeriesPointIndices | null;
  status: 'success' | 'failed';
}

export interface TimeSeriesInterpretation {
  vegetationTrend: string;
  moistureTrend: string;
  soilSurfaceTrend: string;
  summary: string;
  confidence: ConfidenceLevel;
}

export interface TimeSeriesResponse {
  period: {
    start: string;
    end: string;
    months: number;
  };
  filters: {
    maxCloudCoverage: number;
    sampling: 'weekly-best';
  };
  summary: {
    catalogProductCount: number;
    selectedAcquisitionCount: number;
    successfulAcquisitionCount: number;
    failedAcquisitionCount: number;
  };
  series: TimeSeriesPoint[];
  trends: {
    ndvi: TrendStats;
    ndmi: TrendStats;
    bsi: TrendStats;
  };
  interpretation: TimeSeriesInterpretation;
}

class TimeSeriesService {
  async computeTimeSeries(request: TimeSeriesRequest): Promise<TimeSeriesResponse> {
    const period = buildDatetimeRangeMonths(request.months);

    const products = await copernicusCatalogService.search({
      geometry: request.geometry,
      months: request.months,
    });

    const selected = selectTimeSeriesAcquisitions(products, request.maxCloudCoverage);

    if (selected.length === 0) {
      throw new ApiError(
        404,
        'No suitable Sentinel-2 L2A acquisitions found for the given period and cloud filter',
      );
    }

    const series = await mapWithConcurrency(
      selected,
      PROCESS_CONCURRENCY,
      async (product) => this.computeAcquisitionPoint(request.geometry, product),
    );

    const successful = series.filter((point) => point.status === 'success');
    const failedAcquisitionCount = series.length - successful.length;

    const ndviValues = successful.map((point) => point.indices!.ndviMean);
    const ndmiValues = successful.map((point) => point.indices!.ndmiMean);
    const bsiValues = successful.map((point) => point.indices!.bsiMean);

    const trends = {
      ndvi: computeTrend(ndviValues),
      ndmi: computeTrend(ndmiValues),
      bsi: computeTrend(bsiValues),
    };

    const averageValidPixelRatio =
      successful.length === 0
        ? 0
        : successful.reduce((sum, point) => sum + (point.validPixelRatio ?? 0), 0) /
          successful.length;

    const confidence = resolveTimeSeriesConfidence(
      successful.length,
      averageValidPixelRatio,
    );

    const vegetationTrend = interpretVegetationTrend(trends.ndvi.direction);
    const moistureTrend = interpretMoistureTrend(trends.ndmi.direction);
    const soilSurfaceTrend = interpretSoilSurfaceTrend(trends.bsi.direction);

    return {
      period: {
        start: period.start,
        end: period.end,
        months: request.months,
      },
      filters: {
        maxCloudCoverage: request.maxCloudCoverage,
        sampling: 'weekly-best',
      },
      summary: {
        catalogProductCount: products.length,
        selectedAcquisitionCount: selected.length,
        successfulAcquisitionCount: successful.length,
        failedAcquisitionCount,
      },
      series,
      trends,
      interpretation: {
        vegetationTrend,
        moistureTrend,
        soilSurfaceTrend,
        summary: [
          vegetationTrend,
          moistureTrend,
          soilSurfaceTrend,
          'Bu zaman serisi yalnızca uydu sinyallerine dayanır ve saha ile toprak analiziyle doğrulanmalıdır.',
        ].join(' '),
        confidence,
      },
    };
  }

  private async computeAcquisitionPoint(
    geometry: NormalizedGeometry,
    product: SatelliteProduct,
  ): Promise<TimeSeriesPoint> {
    try {
      // Sequential index calls per acquisition keep Process concurrency controlled
      // by the outer mapWithConcurrency (max 3 acquisitions / process slots).
      const ndvi = await indexStatisticsService.computeIndexForProduct(
        'ndvi',
        geometry,
        product,
      );
      const ndmi = await indexStatisticsService.computeIndexForProduct(
        'ndmi',
        geometry,
        product,
      );
      const bsi = await indexStatisticsService.computeIndexForProduct(
        'bsi',
        geometry,
        product,
      );

      const validPixelRatio =
        ndvi.totalPixelCount > 0 ? ndvi.validPixelCount / ndvi.totalPixelCount : 0;

      return {
        productId: product.id,
        datetime: product.datetime,
        satellite: product.satellite,
        tile: product.tile,
        cloudCoverage: product.cloudCoverage,
        validPixelRatio: roundTo4(validPixelRatio),
        indices: {
          ndviMean: ndvi.mean,
          ndmiMean: ndmi.mean,
          bsiMean: bsi.mean,
        },
        status: 'success',
      };
    } catch (error) {
      console.error('[TimeSeries] acquisition failed', {
        productId: product.id,
        datetime: product.datetime,
        message: error instanceof Error ? error.message : 'unknown error',
      });

      return {
        productId: product.id,
        datetime: product.datetime,
        satellite: product.satellite,
        tile: product.tile,
        cloudCoverage: product.cloudCoverage,
        validPixelRatio: null,
        indices: null,
        status: 'failed',
      };
    }
  }
}

export const timeSeriesService = new TimeSeriesService();
