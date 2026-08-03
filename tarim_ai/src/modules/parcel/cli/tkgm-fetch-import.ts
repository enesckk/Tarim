#!/usr/bin/env npx tsx
/**
 * Fetch parcel GeoJSON from TKGM (via scripts/tkgm_geojson_ekle.py) and import
 * into fixtures/parcels/verified for the application parcel provider.
 *
 * Usage:
 *   npm run parcel:tkgm:fetch -- --province Gaziantep --district Şehitkamil \
 *     --neighborhood Güngürge --block 108 --parcel 7
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] ?? null : null;
}

function requireArg(flag: string): string {
  const value = getArg(flag);
  if (!value) {
    throw new Error(`Missing required ${flag}`);
  }
  return value;
}

async function main(): Promise<void> {
  const province = requireArg('--province');
  const district = requireArg('--district');
  const neighborhood = requireArg('--neighborhood');
  const block = getArg('--block') ?? '';
  const parcel = requireArg('--parcel');

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
  const script = path.join(root, 'scripts', 'tkgm_geojson_ekle.py');
  const archiveDir = path.join(root, 'storage', 'tkgm');
  const archivePath = path.join(archiveDir, 'parseller.geojson');
  const slug = `${neighborhood}-${block || '0'}-${parcel}`
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/\s+/g, '-');
  const singlePath = path.join(archiveDir, `${slug}.geojson`);

  await fs.mkdir(archiveDir, { recursive: true });

  const py = spawnSync(
    'python3',
    [
      script,
      '--province',
      province,
      '--district',
      district,
      '--neighborhood',
      neighborhood,
      '--block',
      block,
      '--parcel',
      parcel,
      '--output',
      archivePath,
      '--single-feature-file',
      singlePath,
      '--json',
    ],
    { encoding: 'utf8', cwd: root },
  );

  if (py.status !== 0) {
    throw new Error(py.stderr || py.stdout || 'TKGM fetch failed');
  }

  let fetchSummary: Record<string, unknown> = {};
  try {
    fetchSummary = JSON.parse(py.stdout) as Record<string, unknown>;
  } catch {
    fetchSummary = { raw: py.stdout };
  }

  const importResult = spawnSync(
    'npx',
    [
      'tsx',
      'src/modules/parcel/cli/verified-import.ts',
      '--file',
      singlePath,
      '--province',
      province,
      '--district',
      district,
      '--neighborhood',
      neighborhood,
      '--block',
      block || '0',
      '--parcel',
      parcel,
      '--verifiedBy',
      'tkgm_geojson_ekle',
    ],
    { encoding: 'utf8', cwd: root },
  );

  if (importResult.status !== 0) {
    throw new Error(importResult.stderr || importResult.stdout || 'verified import failed');
  }

  let imported: Record<string, unknown> = {};
  try {
    imported = JSON.parse(importResult.stdout) as Record<string, unknown>;
  } catch {
    imported = { raw: importResult.stdout };
  }

  console.log(
    JSON.stringify(
      {
        status: 'OK',
        fetch: fetchSummary,
        import: imported,
        archivePath,
        singleFeatureFile: singlePath,
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
