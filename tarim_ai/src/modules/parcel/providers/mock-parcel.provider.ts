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

    const province = String(props.il ?? query.province);
    const district = String(props.ilce ?? query.district);
    const neighborhood = String(props.mahalle ?? query.neighborhood);
    const block = String(props.ada_no ?? query.block);
    const parcel = String(props.parsel_no ?? query.parcel);

    let geometry;
    if (matches) {
      try {
        geometry = normalizeGeoJsonGeometry(feature.geometry as never);
      } catch (error) {
        if (error instanceof ApiError) {
          throw new ApiError(422, 'Parsel geometrisi geçersiz.', error.details);
        }
        throw new ApiError(422, 'Parsel geometrisi geçersiz.');
      }
    } else {
      // Dynamic deterministic realistic parcel geometry for any Gaziantep / Şehitkamil parcel
      const hash = (query.neighborhood + query.block + query.parcel)
        .split('')
        .reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const latOffset = ((hash % 100) - 50) * 0.0004;
      const lonOffset = (((hash * 13) % 100) - 50) * 0.0004;

      const baseLat = 37.1124 + latOffset;
      const baseLon = 37.4012 + lonOffset;
      const deltaLat = 0.0016;
      const deltaLon = 0.0022;

      geometry = normalizeGeoJsonGeometry({
        type: 'Polygon',
        coordinates: [[
          [baseLon, baseLat],
          [baseLon + deltaLon, baseLat],
          [baseLon + deltaLon, baseLat + deltaLat],
          [baseLon, baseLat + deltaLat],
          [baseLon, baseLat],
        ]],
      } as never);
    }

    const area = matches
      ? (typeof props.alan_m2 === 'number' ? props.alan_m2 : this.normalization.parseArea(props.alan_m2))
      : 12500;

    return {
      title: `${query.province} / ${query.district} / ${query.neighborhood} / ${query.block} / ${query.parcel}`,
      province: query.province,
      district: query.district,
      neighborhood: query.neighborhood,
      block: query.block,
      parcel: query.parcel,
      landType: matches && typeof props.nitelik === 'string' ? props.nitelik : 'Tarla',
      areaSquareMeters: area,
      sheet: matches && typeof props.pafta === 'string' ? props.pafta : '1',
      geometry,
      bbox: getBbox(geometry),
      centroid: {
        latitude: turf.centroid(geometry).geometry.coordinates[1],
        longitude: turf.centroid(geometry).geometry.coordinates[0],
      },
      provider: 'mock',
      sourceType: 'mock_fixture',
      verified: false,
      fallbackUsed: !matches,
      fallbackReason: !matches ? 'MOCK_PARCEL_GENERATED' : null,
      sourceMetadata: {
        source: matches ? 'local_mock_fixture' : 'generated_mock_parcel',
        computedAreaSquareMeters: getPolygonAreaSqMeters(geometry),
      },
    };
  }
}

