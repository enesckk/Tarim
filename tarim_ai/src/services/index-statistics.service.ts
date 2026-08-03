import { BSI_RAW_EVALSCRIPT } from '../evalscripts/bsi-raw.evalscript.js';
import { NDMI_RAW_EVALSCRIPT } from '../evalscripts/ndmi-raw.evalscript.js';
import { NDVI_RAW_EVALSCRIPT } from '../evalscripts/ndvi-raw.evalscript.js';
import type { NormalizedGeometry } from '../types/geojson.types.js';
import type { SatelliteProduct } from '../types/satellite.types.js';
import { ApiError } from '../utils/api-error.js';
import { computeImageDimensions } from '../utils/geometry.utils.js';
import { readFloatRasterBand } from '../utils/geotiff.utils.js';
import {
  computeBsiStatistics,
  computeNdmiStatistics,
  computeNdviStatistics,
  hasValidIndexPixels,
  type BsiStatistics,
  type NdmiStatistics,
  type NdviStatistics,
} from '../utils/statistics.utils.js';
import { copernicusCatalogService } from './copernicus-catalog.service.js';
import { copernicusProcessService } from './copernicus-process.service.js';
import {
  selectBestProduct,
  type BestProductSelection,
} from './satellite-selection.service.js';

export type SpectralIndex = 'ndvi' | 'ndmi' | 'bsi';

export interface IndexStatisticsRequest {
  geometry: NormalizedGeometry;
  days: number;
}

export interface ProductSummary {
  productId: string;
  datetime: string;
  satellite: string;
  tile: string | null;
  cloudCoverage: number | null;
}

export interface IndexStatisticsResult<TStats> {
  selectionType: 'best';
  selectionReason: string;
  product: ProductSummary;
  statistics: TStats;
}

const INDEX_CONFIG = {
  ndvi: {
    evalscript: NDVI_RAW_EVALSCRIPT,
    label: 'NDVI GeoTIFF',
    emptyMessage: 'No valid NDVI pixels found for the selected product',
    compute: computeNdviStatistics,
  },
  ndmi: {
    evalscript: NDMI_RAW_EVALSCRIPT,
    label: 'NDMI GeoTIFF',
    emptyMessage: 'No valid NDMI pixels found for the selected product',
    compute: computeNdmiStatistics,
  },
  bsi: {
    evalscript: BSI_RAW_EVALSCRIPT,
    label: 'BSI GeoTIFF',
    emptyMessage: 'No valid BSI pixels found for the selected product',
    compute: computeBsiStatistics,
  },
} as const;

class IndexStatisticsService {
  async selectBestAcquisition(
    request: IndexStatisticsRequest,
  ): Promise<BestProductSelection> {
    const products = await copernicusCatalogService.search({
      geometry: request.geometry,
      days: request.days,
    });

    const best = selectBestProduct(products);
    if (!best) {
      throw new ApiError(
        404,
        'No Sentinel-2 L2A products found for the given geometry and date range',
      );
    }

    return best;
  }

  async computeBestNdviStatistics(
    request: IndexStatisticsRequest,
  ): Promise<IndexStatisticsResult<NdviStatistics>> {
    return this.computeBestIndexStatistics('ndvi', request);
  }

  async computeBestNdmiStatistics(
    request: IndexStatisticsRequest,
  ): Promise<IndexStatisticsResult<NdmiStatistics>> {
    return this.computeBestIndexStatistics('ndmi', request);
  }

  async computeBestBsiStatistics(
    request: IndexStatisticsRequest,
  ): Promise<IndexStatisticsResult<BsiStatistics>> {
    return this.computeBestIndexStatistics('bsi', request);
  }

  async computeIndexForProduct(
    index: SpectralIndex,
    geometry: NormalizedGeometry,
    product: SatelliteProduct,
  ): Promise<NdviStatistics | NdmiStatistics | BsiStatistics> {
    const config = INDEX_CONFIG[index];
    const { width, height } = computeImageDimensions(geometry);

    const tiffBuffer = await copernicusProcessService.processImage({
      geometry,
      datetime: product.datetime,
      productId: product.id,
      tile: product.tile,
      cloudCoverage: product.cloudCoverage,
      evalscript: config.evalscript,
      width,
      height,
      outputFormat: 'image/tiff',
    });

    const values = await readFloatRasterBand(tiffBuffer, config.label);
    const statistics = config.compute(values);

    if (!hasValidIndexPixels(statistics)) {
      throw new ApiError(422, config.emptyMessage);
    }

    return statistics;
  }

  private async computeBestIndexStatistics<TIndex extends SpectralIndex>(
    index: TIndex,
    request: IndexStatisticsRequest,
  ): Promise<IndexStatisticsResult<ReturnType<(typeof INDEX_CONFIG)[TIndex]['compute']>>> {
    const best = await this.selectBestAcquisition(request);
    const statistics = await this.computeIndexForProduct(
      index,
      request.geometry,
      best.product,
    );

    return {
      selectionType: 'best',
      selectionReason: best.selectionReason,
      product: toProductSummary(best.product),
      statistics: statistics as ReturnType<(typeof INDEX_CONFIG)[TIndex]['compute']>,
    };
  }
}

export function toProductSummary(product: SatelliteProduct): ProductSummary {
  return {
    productId: product.id,
    datetime: product.datetime,
    satellite: product.satellite,
    tile: product.tile,
    cloudCoverage: product.cloudCoverage,
  };
}

export const indexStatisticsService = new IndexStatisticsService();
