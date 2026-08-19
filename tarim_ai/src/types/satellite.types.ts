import type { NormalizedGeometry } from './geojson.types.js';
import type { NdviStatistics } from '../utils/statistics.utils.js';

export interface SatelliteProduct {
  id: string;
  datetime: string;
  satellite: string;
  cloudCoverage: number | null;
  tile: string | null;
}

export interface SatelliteSearchResult {
  count: number;
  latest: SatelliteProduct | null;
  products: SatelliteProduct[];
}

export interface CatalogFeatureProperties {
  datetime?: string;
  start_datetime?: string;
  end_datetime?: string;
  platform?: string;
  constellation?: string;
  'eo:cloud_cover'?: number;
  's2:product_type'?: string;
  's2:mgrs_tile'?: string;
  [key: string]: unknown;
}

export interface CatalogFeature {
  id: string;
  type: 'Feature';
  geometry?: unknown;
  properties?: CatalogFeatureProperties;
  bbox?: number[];
}

export interface CatalogSearchResponse {
  type?: string;
  features?: CatalogFeature[];
  context?: {
    matched?: number;
    returned?: number;
    limit?: number;
    next?: string | number;
  };
  links?: Array<{
    rel?: string;
    href?: string;
    body?: unknown;
  }>;
}

export interface ImageOutputResult {
  productId: string;
  datetime: string;
  satellite: string;
  tile: string | null;
  cloudCoverage: number | null;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  type: 'true-color' | 'ndvi' | 'ndmi' | 'bsi';
}

export interface BestImageOutputResult extends ImageOutputResult {
  selectionType: 'best';
  selectionReason: string;
}

export interface ProcessImageOptions {
  geometry: NormalizedGeometry;
  datetime: string;
  productId?: string | null;
  tile?: string | null;
  cloudCoverage?: number | null;
  evalscript: string;
  width: number;
  height: number;
  /** Defaults to image/png. Use image/tiff for raw FLOAT32 rasters. */
  outputFormat?: 'image/png' | 'image/tiff';
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface NdviStatisticsResponse {
  selectionType: 'best';
  selectionReason: string;
  product: {
    productId: string;
    datetime: string;
    satellite: string;
    tile: string | null;
    cloudCoverage: number | null;
  };
  statistics: NdviStatistics;
}
