import type { Queryable } from '../../database/database-client.js';
import { getPool, withTransaction } from '../../database/database-client.js';
import { mapPgError } from '../../database/errors/database-errors.js';
import type { ParcelQuery } from '../types/parcel.types.js';

export interface VerifiedParcelRecord {
  id: string;
  province: string;
  district: string;
  neighborhood: string;
  block: string;
  parcel: string;
  geometryJson: Record<string, unknown>;
  areaSquareMeters: number;
  centroidLatitude: number;
  centroidLongitude: number;
  source: string;
  verificationStatus: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  checksum: string;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
}

type Row = {
  id: string;
  province: string;
  district: string;
  neighborhood: string;
  block: string;
  parcel: string;
  geometry_json: Record<string, unknown>;
  area_square_meters: number;
  centroid_latitude: number;
  centroid_longitude: number;
  source: string;
  verification_status: string;
  verified_at: Date | null;
  verified_by: string | null;
  checksum: string;
  created_at: Date;
  updated_at: Date;
  row_version: number;
};

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function mapRow(row: Row): VerifiedParcelRecord {
  return {
    id: row.id,
    province: row.province,
    district: row.district,
    neighborhood: row.neighborhood,
    block: row.block,
    parcel: row.parcel,
    geometryJson: row.geometry_json,
    areaSquareMeters: row.area_square_meters,
    centroidLatitude: row.centroid_latitude,
    centroidLongitude: row.centroid_longitude,
    source: row.source,
    verificationStatus: row.verification_status,
    verifiedAt: toIso(row.verified_at),
    verifiedBy: row.verified_by,
    checksum: row.checksum,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    rowVersion: row.row_version,
  };
}

export class VerifiedParcelRepository {
  constructor(private readonly dbFactory: () => Queryable = () => getPool()) {}

  async upsertVerified(
    input: Omit<VerifiedParcelRecord, 'id' | 'createdAt' | 'updatedAt' | 'rowVersion'>,
  ): Promise<VerifiedParcelRecord> {
    try {
      return await withTransaction(async (client) => {
        const result = await client.query<Row>(
          `INSERT INTO verified_parcels (
             province, district, neighborhood, block, parcel,
             geometry_json, area_square_meters, centroid_latitude, centroid_longitude,
             source, verification_status, verified_at, verified_by, checksum
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
           )
           ON CONFLICT (province, district, neighborhood, block, parcel)
           DO UPDATE SET
             geometry_json = EXCLUDED.geometry_json,
             area_square_meters = EXCLUDED.area_square_meters,
             centroid_latitude = EXCLUDED.centroid_latitude,
             centroid_longitude = EXCLUDED.centroid_longitude,
             source = EXCLUDED.source,
             verification_status = EXCLUDED.verification_status,
             verified_at = EXCLUDED.verified_at,
             verified_by = EXCLUDED.verified_by,
             checksum = EXCLUDED.checksum,
             updated_at = NOW(),
             row_version = verified_parcels.row_version + 1
           RETURNING *`,
          [
            input.province,
            input.district,
            input.neighborhood,
            input.block,
            input.parcel,
            JSON.stringify(input.geometryJson),
            input.areaSquareMeters,
            input.centroidLatitude,
            input.centroidLongitude,
            input.source,
            input.verificationStatus,
            input.verifiedAt,
            input.verifiedBy,
            input.checksum,
          ],
        );
        return mapRow(result.rows[0]!);
      });
    } catch (error) {
      mapPgError(error);
    }
  }

  async findVerified(query: ParcelQuery): Promise<VerifiedParcelRecord | null> {
    try {
      const result = await this.dbFactory().query<Row>(
        `SELECT * FROM verified_parcels
         WHERE province = $1
           AND district = $2
           AND neighborhood = $3
           AND block = $4
           AND parcel = $5
           AND verification_status = 'verified'`,
        [
          query.province,
          query.district,
          query.neighborhood,
          query.block,
          query.parcel,
        ],
      );
      if (result.rows.length > 0) {
        return mapRow(result.rows[0]!);
      }

      const fallback = await this.dbFactory().query<Row>(
        `SELECT * FROM verified_parcels
         WHERE lower(province) = lower($1)
           AND lower(district) = lower($2)
           AND lower(neighborhood) = lower($3)
           AND lower(block) = lower($4)
           AND lower(parcel) = lower($5)
           AND verification_status = 'verified'`,
        [
          query.province,
          query.district,
          query.neighborhood,
          query.block,
          query.parcel,
        ],
      );
      return fallback.rows[0] ? mapRow(fallback.rows[0]) : null;
    } catch (error) {
      mapPgError(error);
    }
  }
}
