import fs from 'node:fs/promises';
import path from 'node:path';
import { getEnv, resetEnvCache } from '../../../config/env.js';
import { closePool, isDatabaseEnabled } from '../../database/index.js';
import { VerifiedParcelRepository } from '../repositories/verified-parcel.repository.js';
import {
  buildVerifiedParcelSlug,
  getVerifiedParcelDir,
  loadVerifiedParcelDocument,
  sha256Hex,
  type VerifiedParcelManifest,
} from '../services/verified-parcel-geometry.service.js';
import type { ParcelQuery } from '../types/parcel.types.js';

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] ?? null : null;
}

async function main(): Promise<void> {
  resetEnvCache();
  const file = getArg('--file');
  const province = getArg('--province');
  const district = getArg('--district');
  const neighborhood = getArg('--neighborhood');
  const block = getArg('--block');
  const parcel = getArg('--parcel');
  const verifiedBy = getArg('--verifiedBy') ?? 'cli_import';

  if (!file || !province || !district || !neighborhood || !block || !parcel) {
    throw new Error(
      'Usage: npm run parcel:verified:import -- --file <geojson> --province <value> --district <value> --neighborhood <value> --block <value> --parcel <value>',
    );
  }

  const query: ParcelQuery = { province, district, neighborhood, block, parcel };
  const absoluteSource = path.resolve(process.cwd(), file);
  const slug = buildVerifiedParcelSlug(query);
  const targetDir = getVerifiedParcelDir();
  const targetGeometry = path.join(targetDir, `${slug}.geojson`);
  const rawGeometry = await fs.readFile(absoluteSource, 'utf8');

  if (/placeholder/i.test(rawGeometry)) {
    throw new Error('Placeholder GeoJSON is not allowed for verified parcel import.');
  }

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetGeometry, rawGeometry, 'utf8');

  const checksum = sha256Hex(rawGeometry);
  const manifest: VerifiedParcelManifest = {
    province,
    district,
    neighborhood,
    block,
    parcel,
    source: 'manually_verified_real_geometry',
    verified: true,
    verifiedAt: new Date().toISOString(),
    verifiedBy,
    geometryFile: `${slug}.geojson`,
    checksum,
  };
  const manifestPath = path.join(targetDir, `${slug}.manifest.json`);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const document = await loadVerifiedParcelDocument(query, { manifestPath });
  if (isDatabaseEnabled() && getEnv().PERSISTENCE_PROVIDER === 'postgresql') {
    const repository = new VerifiedParcelRepository();
    await repository.upsertVerified({
      province,
      district,
      neighborhood,
      block,
      parcel,
      geometryJson: document.geometry as unknown as Record<string, unknown>,
      areaSquareMeters: document.areaSquareMeters,
      centroidLatitude: document.centroid.latitude,
      centroidLongitude: document.centroid.longitude,
      source: manifest.source,
      verificationStatus: 'verified',
      verifiedAt: manifest.verifiedAt,
      verifiedBy: manifest.verifiedBy,
      checksum: manifest.checksum,
    });
  }

  console.log(
    JSON.stringify(
      {
        status: 'IMPORTED',
        slug,
        manifestPath,
        geometryPath: targetGeometry,
        checksum,
        areaSquareMeters: document.areaSquareMeters,
        centroid: document.centroid,
        databaseWrite:
          isDatabaseEnabled() && getEnv().PERSISTENCE_PROVIDER === 'postgresql' ? 'performed' : 'skipped',
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          status: 'FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
