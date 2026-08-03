import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { resetEnvCache } from '../../../config/env.js';
import {
  closePool,
  resetDatabaseClient,
  withTransaction,
  checkConnectivity,
} from '../../database/database-client.js';
import { migrateUp } from '../../database/migrations/runner.js';
import { VerifiedParcelRepository } from '../repositories/verified-parcel.repository.js';
import { DatabaseParcelProvider } from '../providers/database-parcel.provider.js';

const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://tarim:tarim@localhost:5433/tarim_ai';

function enablePgEnv(): void {
  process.env.COPERNICUS_CLIENT_ID = process.env.COPERNICUS_CLIENT_ID || 'test-id';
  process.env.COPERNICUS_CLIENT_SECRET =
    process.env.COPERNICUS_CLIENT_SECRET || 'test-secret';
  process.env.DATABASE_ENABLED = 'true';
  process.env.PERSISTENCE_PROVIDER = 'postgresql';
  process.env.DATABASE_URL = databaseUrl;
  process.env.DATABASE_AUTO_MIGRATE = 'false';
  resetEnvCache();
}

const query = {
  province: 'Gaziantep',
  district: 'Şehitkamil',
  neighborhood: 'Güngürge',
  block: '108',
  parcel: '7',
};

describe('postgresql verified parcel provider', () => {
  let connected = false;

  beforeAll(async () => {
    enablePgEnv();
    await resetDatabaseClient();
    try {
      connected = (await checkConnectivity()).connected;
    } catch {
      connected = false;
    }
    if (connected) await migrateUp();
  });

  afterAll(async () => {
    await closePool();
    process.env.PERSISTENCE_PROVIDER = 'in-memory';
    process.env.DATABASE_ENABLED = 'false';
    delete process.env.DATABASE_URL;
    resetEnvCache();
    await resetDatabaseClient();
  });

  beforeEach(async ({ skip }) => {
    if (!connected) skip();
    enablePgEnv();
    await resetDatabaseClient();
    await withTransaction(async (client) => {
      await client.query('TRUNCATE verified_parcels CASCADE');
    });
  });

  it('reads verified parcel records and rejects unverified ones', async ({ skip }) => {
    if (!connected) skip();
    const repo = new VerifiedParcelRepository();
    await repo.upsertVerified({
      province: query.province,
      district: query.district,
      neighborhood: query.neighborhood,
      block: query.block,
      parcel: query.parcel,
      geometryJson: {
        type: 'Polygon',
        coordinates: [
          [
            [37.47634, 37.20623],
            [37.47514, 37.20754],
            [37.47414, 37.20709],
            [37.47634, 37.20623],
          ],
        ],
      },
      areaSquareMeters: 1000,
      centroidLatitude: 37.2069,
      centroidLongitude: 37.4752,
      source: 'test_verified',
      verificationStatus: 'verified',
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'test',
      checksum: 'abc123',
    });

    const provider = new DatabaseParcelProvider(repo);
    const parcel = await provider.resolve(query);
    expect(parcel.provider).toBe('database');
    expect(parcel.verified).toBe(true);

    await withTransaction(async (client) => {
      await client.query('TRUNCATE verified_parcels CASCADE');
      await client.query(
        `INSERT INTO verified_parcels (
          province, district, neighborhood, block, parcel,
          geometry_json, area_square_meters, centroid_latitude, centroid_longitude,
          source, verification_status, verified_at, verified_by, checksum
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          query.province,
          query.district,
          query.neighborhood,
          query.block,
          query.parcel,
          JSON.stringify({
            type: 'Polygon',
            coordinates: [
              [
                [37.47634, 37.20623],
                [37.47514, 37.20754],
                [37.47414, 37.20709],
                [37.47634, 37.20623],
              ],
            ],
          }),
          1000,
          37.2069,
          37.4752,
          'test_pending',
          'pending',
          new Date().toISOString(),
          'test',
          'abc123',
        ],
      );
    });

    await expect(provider.resolve(query)).rejects.toMatchObject({
      code: 'VERIFIED_PARCEL_MISSING',
    });
  });
});
