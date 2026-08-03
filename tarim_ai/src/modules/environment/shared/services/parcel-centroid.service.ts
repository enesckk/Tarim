import * as turf from '@turf/turf';
import { ApiError } from '../../../../utils/api-error.js';
import type { NormalizedGeometry } from '../../../../types/geojson.types.js';
import type { ProviderLocation } from '../types/provider-metadata.types.js';

/**
 * Returns a point guaranteed to lie on/within the polygon using Turf pointOnFeature.
 */
export function computeParcelCentroid(geometry: NormalizedGeometry): ProviderLocation {
  try {
    const feature =
      geometry.type === 'Polygon'
        ? turf.polygon(geometry.coordinates as number[][][])
        : turf.multiPolygon(geometry.coordinates as number[][][][]);

    const point = turf.pointOnFeature(feature);
    const [longitude, latitude] = point.geometry.coordinates;

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      throw new Error('Non-finite centroid coordinates');
    }

    return { longitude, latitude };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(422, 'Parsel geometrisi geçersiz.');
  }
}

export class ParcelCentroidService {
  fromGeometry(geometry: NormalizedGeometry): ProviderLocation {
    return computeParcelCentroid(geometry);
  }
}
