import { ApiError } from '../../../utils/api-error.js';
import { getBbox, normalizeGeoJsonGeometry } from '../../../utils/geometry.utils.js';
import * as turf from '@turf/turf';
import type { ParcelProvider } from './parcel-provider.interface.js';
import type { ParcelQuery, ResolvedParcel } from '../types/parcel.types.js';
import type { TkgmParcelFeature } from '../types/tkgm.types.js';
import { TkgmProviderService } from '../services/tkgm-provider.service.js';
import { ParcelNormalizationService } from '../services/parcel-normalization.service.js';

/**
 * ParcelProvider implementation backed by TKGM CBS endpoints.
 *
 * LIMITATION: TKGM endpoints are unofficial/unstable; parcel-by-ada routes may
 * require e-Devlet session cookies. Failures are mapped to safe 502/404 errors
 * so the rest of the application continues to operate.
 */
export class TkgmParcelProvider implements ParcelProvider {
  readonly name = 'tkgm';

  constructor(
    private readonly tkgm: TkgmProviderService = new TkgmProviderService(),
    private readonly normalization = new ParcelNormalizationService(),
  ) {}

  async resolve(query: ParcelQuery): Promise<ResolvedParcel> {
    const provinceId = await this.tkgm.findProvinceId(query.province);
    const districtId = await this.tkgm.findDistrictId(provinceId, query.district);
    const neighborhoodId = await this.tkgm.findNeighborhoodId(districtId, query.neighborhood);
    const feature = await this.tkgm.fetchParcelFeature(
      neighborhoodId,
      query.block,
      query.parcel,
    );

    return this.mapFeature(feature, query);
  }

  mapFeature(feature: TkgmParcelFeature, query: ParcelQuery): ResolvedParcel {
    if (!feature.geometry) {
      throw new ApiError(422, 'Parsel geometrisi geçersiz.');
    }

    const geometryType = feature.geometry.type;
    if (geometryType !== 'Polygon' && geometryType !== 'MultiPolygon') {
      throw new ApiError(422, 'Parsel geometrisi geçersiz.');
    }

    let geometry;
    try {
      geometry = normalizeGeoJsonGeometry({
        type: geometryType,
        coordinates: feature.geometry.coordinates as never,
      });
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 400) {
        throw new ApiError(422, 'Parsel geometrisi geçersiz.', error.details);
      }
      throw new ApiError(422, 'Parsel geometrisi geçersiz.');
    }

    const props = feature.properties ?? {};
    const province = String(props.ilAd ?? query.province);
    const district = String(props.ilceAd ?? query.district);
    const neighborhood = String(props.mahalleAd ?? query.neighborhood);
    const block = String(props.adaNo ?? query.block);
    const parcel = String(props.parselNo ?? query.parcel);

    return {
      title: `${province} / ${district} / ${neighborhood} / ${block} / ${parcel}`,
      province,
      district,
      neighborhood,
      block,
      parcel,
      landType: typeof props.nitelik === 'string' ? props.nitelik : null,
      areaSquareMeters: this.normalization.parseArea(props.alan),
      sheet: typeof props.pafta === 'string' ? props.pafta : null,
      geometry,
      bbox: getBbox(geometry),
      centroid: {
        latitude: turf.centroid(geometry).geometry.coordinates[1],
        longitude: turf.centroid(geometry).geometry.coordinates[0],
      },
      provider: 'tkgm',
      sourceType: 'official_service',
      verified: true,
      fallbackUsed: false,
      fallbackReason: null,
      sourceMetadata: {
        provider: 'tkgm',
      },
    };
  }
}
