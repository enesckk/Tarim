import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildVerifiedParcelSlug,
  getVerifiedParcelDir,
  loadVerifiedParcelDocument,
  readJsonFile,
  type VerifiedParcelManifest,
} from '../services/verified-parcel-geometry.service.js';
import type { ParcelQuery } from '../types/parcel.types.js';

const query: ParcelQuery = {
  province: 'Gaziantep',
  district: 'Şehitkamil',
  neighborhood: 'Güngürge',
  block: '108',
  parcel: '7',
};

async function main(): Promise<void> {
  const slug = buildVerifiedParcelSlug(query);
  const manifestPath = path.join(getVerifiedParcelDir(), `${slug}.manifest.json`);
  const manifest = await readJsonFile<VerifiedParcelManifest>(manifestPath);
  const geometryPath = path.join(path.dirname(manifestPath), manifest.geometryFile);
  await fs.access(geometryPath);
  const document = await loadVerifiedParcelDocument(query, { manifestPath });

  console.log(
    JSON.stringify(
      {
        status: 'VERIFIED',
        slug,
        manifestIdentityMatches: true,
        verified: manifest.verified,
        checksum: manifest.checksum,
        areaSquareMeters: document.areaSquareMeters,
        centroid: document.centroid,
        geometryType: document.geometry.type,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
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
});
