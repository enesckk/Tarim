import { ApiError } from '../../../utils/api-error.js';
import { getBbox, normalizeGeoJsonGeometry } from '../../../utils/geometry.utils.js';
import type { ParcelProvider } from './parcel-provider.interface.js';
import type { ParcelQuery, ResolvedParcel } from '../types/parcel.types.js';
import { VerifiedParcelRepository } from '../repositories/verified-parcel.repository.js';

export class DatabaseParcelProvider implements ParcelProvider {
  readonly name = 'database';

  constructor(private readonly repository = new VerifiedParcelRepository()) {}

  async resolve(query: ParcelQuery): Promise<ResolvedParcel> {
    const record = await this.repository.findVerified(query);
    if (!record) {
      throw new ApiError(404, 'Verified parcel record not found.', {
        code: 'VERIFIED_PARCEL_MISSING',
      });
    }

    const geometry = normalizeGeoJsonGeometry(record.geometryJson as never);
    return {
      title: `${record.province} / ${record.district} / ${record.neighborhood} / ${record.block} / ${record.parcel}`,
      province: record.province,
      district: record.district,
      neighborhood: record.neighborhood,
      block: record.block,
      parcel: record.parcel,
      landType: null,
      areaSquareMeters: record.areaSquareMeters,
      sheet: null,
      geometry,
      bbox: getBbox(geometry),
      centroid: {
        latitude: record.centroidLatitude,
        longitude: record.centroidLongitude,
      },
      provider: 'database',
      sourceType: 'verified_database_record',
      verified: true,
      fallbackUsed: false,
      fallbackReason: null,
      sourceMetadata: {
        source: record.source,
        verifiedAt: record.verifiedAt,
        verifiedBy: record.verifiedBy,
        checksum: record.checksum,
      },
    };
  }
}
