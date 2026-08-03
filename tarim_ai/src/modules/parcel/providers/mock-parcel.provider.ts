import fs from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from '../../../utils/api-error.js';
import { getBbox, getPolygonAreaSqMeters, normalizeGeoJsonGeometry } from '../../../utils/geometry.utils.js';
import * as turf from '@turf/turf';
import type { ParcelProvider } from './parcel-provider.interface.js';
import type { ParcelQuery, ResolvedParcel } from '../types/parcel.types.js';
import { ParcelNormalizationService } from '../services/parcel-normalization.service.js';

/**
 * Local development provider backed by data/parcels/gungurge-108-7.geojson.
 */
export class MockParcelProvider implements ParcelProvider {
  readonly name = 'mock';

  constructor(
    private readonly normalization = new ParcelNormalizationService(),
    private readonly geojsonPath = path.resolve(
      process.cwd(),
      'data/parcels/gungurge-108-7.geojson',
    ),
  ) {}

  async resolve(query: ParcelQuery): Promise<ResolvedParcel> {
    const collection = JSON.parse(await fs.readFile(this.geojsonPath, 'utf8')) as {
      features?: Array<{
        geometry?: unknown;
        properties?: Record<string, unknown>;
      }>;
    };

    const feature = collection.features?.[0];
    if (!feature?.geometry || !feature.properties) {
      throw new ApiError(502, 'Parsel bilgisi şu anda alınamıyor.');
    }

    const props = feature.properties;
    const matches =
      this.normalization.matchesName(String(props.il ?? ''), query.province) &&
      this.normalization.matchesName(String(props.ilce ?? ''), query.district) &&
      this.normalization.matchesName(String(props.mahalle ?? ''), query.neighborhood) &&
      this.normalization.matchesName(String(props.ada_no ?? ''), query.block) &&
      this.normalization.matchesName(String(props.parsel_no ?? ''), query.parcel);

    if (!matches) {
      throw new ApiError(404, 'Parsel bulunamadı.');
    }

    let geometry;
    try {
      geometry = normalizeGeoJsonGeometry(feature.geometry as never);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(422, 'Parsel geometrisi geçersiz.', error.details);
      }
      throw new ApiError(422, 'Parsel geometrisi geçersiz.');
    }

    const province = String(props.il ?? query.province);
    const district = String(props.ilce ?? query.district);
    const neighborhood = String(props.mahalle ?? query.neighborhood);
    const block = String(props.ada_no ?? query.block);
    const parcel = String(props.parsel_no ?? query.parcel);

    return {
      title: `${province} / ${district} / ${neighborhood} / ${block} / ${parcel}`,
      province,
      district,
      neighborhood,
      block,
      parcel,
      landType: typeof props.nitelik === 'string' ? props.nitelik : null,
      areaSquareMeters:
        typeof props.alan_m2 === 'number'
          ? props.alan_m2
          : this.normalization.parseArea(props.alan_m2),
      sheet: typeof props.pafta === 'string' ? props.pafta : null,
      geometry,
      bbox: getBbox(geometry),
      centroid: {
        latitude: turf.centroid(geometry).geometry.coordinates[1],
        longitude: turf.centroid(geometry).geometry.coordinates[0],
      },
      provider: 'mock',
      sourceType: 'mock_fixture',
      verified: false,
      fallbackUsed: false,
      fallbackReason: null,
      sourceMetadata: {
        source: 'local_mock_fixture',
        computedAreaSquareMeters: getPolygonAreaSqMeters(geometry),
      },
    };
  }
}
