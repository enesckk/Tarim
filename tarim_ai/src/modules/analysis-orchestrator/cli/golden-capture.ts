import { writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { createApp } from '../../../app.js';
import { loadVerifiedParcelDocument } from '../../parcel/services/verified-parcel-geometry.service.js';
import { verifyGoldenDataset } from '../golden/golden-verify.js';

const GOLDEN_DIR = join(process.cwd(), 'fixtures', 'golden', 'gungurge-108-7');

const PARCEL = {
  province: 'Gaziantep',
  district: 'Şehitkamil',
  neighborhood: 'Güngürge',
  block: '108',
  parcel: '7',
};

const REQUIRED_LIVE_ENV_KEYS = [
  'COPERNICUS_CLIENT_ID',
  'COPERNICUS_CLIENT_SECRET',
] as const;
const CAPTURE_POLL_INTERVAL_MS = 2_000;
const CAPTURE_MAX_POLLS = 180;

function listMissingCaptureEnv(): string[] {
  const missing: string[] = [];

  for (const key of REQUIRED_LIVE_ENV_KEYS) {
    if (!process.env[key]?.trim()) {
      missing.push(key);
    }
  }

  const parcelProvider = process.env.PARCEL_PROVIDER ?? 'mock';
  if (!parcelProvider || parcelProvider === 'mock') {
    missing.push('PARCEL_PROVIDER(non-mock)');
  }
  if (parcelProvider === 'fallback') {
    const order = (process.env.PARCEL_PROVIDER_ORDER ?? '')
      .split(',')
      .map((value) => value.trim());
    if (!order.includes('verified_geojson')) {
      missing.push('PARCEL_PROVIDER_ORDER(includes verified_geojson)');
    }
  }

  const climateProvider = process.env.CLIMATE_PROVIDER ?? 'mock';
  if (!climateProvider || climateProvider === 'mock') {
    missing.push('CLIMATE_PROVIDER(non-mock)');
  }

  const soilProvider = process.env.SOIL_PROVIDER ?? 'mock';
  if (!soilProvider || soilProvider === 'mock') {
    missing.push('SOIL_PROVIDER(non-mock)');
  }

  const terrainProvider = process.env.TERRAIN_PROVIDER ?? 'mock';
  if (!terrainProvider || terrainProvider === 'mock') {
    missing.push('TERRAIN_PROVIDER(non-mock)');
  }
  if (
    (terrainProvider === 'copernicus-dem' || terrainProvider === 'fallback') &&
    process.env.TERRAIN_DEM_ENABLED !== 'true'
  ) {
    missing.push('TERRAIN_DEM_ENABLED=true');
  }

  return missing;
}

function printSkipped(reason: string, missing: string[]): never {
  console.error('[golden:capture] SKIPPED_WITH_REASON');
  console.error(`[golden:capture] reason=${reason}`);
  if (missing.length > 0) {
    console.error('[golden:capture] missing_env_keys:');
    for (const key of missing) {
      console.error(`  - ${key}`);
    }
  }
  console.error(
    '[golden:capture] Set live credentials/providers, then re-run: npm run demo:golden:capture',
  );
  process.exit(1);
}

async function capture(): Promise<void> {
  console.log('[golden:capture] Starting golden dataset capture...');
  console.log('[golden:capture] Parcel:', JSON.stringify(PARCEL));

  const missingBefore = listMissingCaptureEnv();
  if (missingBefore.length > 0) {
    printSkipped('missing_live_credentials_or_providers', missingBefore);
  }
  try {
    await loadVerifiedParcelDocument(PARCEL);
  } catch {
    printSkipped('MISSING_VERIFIED_GEOJSON', ['fixtures/parcels/verified/gungurge-108-7.geojson']);
  }

  process.env.ANALYSIS_DATA_MODE = 'live';

  const app = createApp();
  const port = 14000 + Math.floor(Math.random() * 1000);

  const server = app.listen(port, async () => {
    try {
      console.log(`[golden:capture] Server started on port ${port}`);

      const res = await fetch(`http://127.0.0.1:${port}/api/analyses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(PARCEL),
      });

      if (!res.ok) {
        const body = await res.text();
        const missing = listMissingCaptureEnv();
        const looksLikeAuth =
          res.status === 401 ||
          res.status === 403 ||
          /credential|unauthorized|not configured|missing/i.test(body);

        if (looksLikeAuth || missing.length > 0) {
          console.error(`[golden:capture] Analysis creation failed: ${res.status}`);
          printSkipped('create_analysis_failed_missing_credentials', missing);
        }

        console.error(`[golden:capture] Analysis creation failed: ${res.status} ${body}`);
        server.close();
        process.exit(1);
      }

      const created = (await res.json()) as { analysisId: string; status: string };
      console.log(`[golden:capture] Analysis created: ${created.analysisId}`);

      let finalResult: Record<string, unknown> | null = null;
      for (let i = 0; i < CAPTURE_MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, CAPTURE_POLL_INTERVAL_MS));
        const statusRes = await fetch(
          `http://127.0.0.1:${port}/api/analyses/${created.analysisId}/status`,
        );
        const data = (await statusRes.json()) as { status: string; currentStep?: string | null };
        console.log(
          `[golden:capture] Status: ${data.status}${data.currentStep ? ` step=${data.currentStep}` : ''}`,
        );

        if (data.status === 'completed' || data.status === 'partial_completed') {
          const finalRes = await fetch(
            `http://127.0.0.1:${port}/api/analyses/${created.analysisId}`,
          );
          finalResult = (await finalRes.json()) as Record<string, unknown>;
          break;
        }
        if (data.status === 'failed') {
          console.error('[golden:capture] Analysis failed');
          const detailRes = await fetch(
            `http://127.0.0.1:${port}/api/analyses/${created.analysisId}`,
          );
          const detail = (await detailRes.json()) as Record<string, unknown>;
          console.error(
            '[golden:capture] SKIPPED_WITH_REASON reason=live_analysis_failed',
          );
          console.error(
            `[golden:capture] errorCode=${String(detail.errorCode ?? detail.status)}`,
          );
          console.error(
            '[golden:capture] TKGM/parcel or provider failure — do not mark placeholder as captured',
          );
          console.error(
            '[golden:capture] Exact blockers may include: PARCEL_PROVIDER=tkgm HTTP 403, Sentinel auth, DEM, NASA POWER, SoilGrids',
          );
          break;
        }
      }

      if (!finalResult) {
        console.error('[golden:capture] No final result obtained');
        console.error(
          `[golden:capture] SKIPPED_WITH_REASON reason=no_final_result_after_${CAPTURE_MAX_POLLS * CAPTURE_POLL_INTERVAL_MS}ms`,
        );
        server.close();
        process.exit(1);
      }

      await mkdir(GOLDEN_DIR, { recursive: true });

      const imagePaths = await exportAnalysisImages(created.analysisId);
      const finalJson = JSON.stringify(finalResult, null, 2);
      await writeFile(join(GOLDEN_DIR, 'final-analysis.json'), finalJson);
      console.log('[golden:capture] Saved final-analysis.json');

      let manifest = {
        parcel: PARCEL,
        datasetType: 'captured',
        demoReady: false,
        capturedAt: new Date().toISOString(),
        sourceMode: 'live',
        files: ['final-analysis.json', 'checksums.json'],
        images: imagePaths,
        status: 'captured',
      };
      const manifestJson = JSON.stringify(manifest, null, 2);
      await writeFile(join(GOLDEN_DIR, 'manifest.json'), manifestJson);
      console.log('[golden:capture] Saved manifest.json');

      const checksums: Record<string, string> = {};
      for (const file of ['final-analysis.json', 'manifest.json']) {
        const content = await import('node:fs').then((fs) =>
          fs.readFileSync(join(GOLDEN_DIR, file)),
        );
        checksums[file] = createHash('sha256').update(content).digest('hex');
      }
      await writeFile(
        join(GOLDEN_DIR, 'checksums.json'),
        JSON.stringify(checksums, null, 2),
      );
      console.log('[golden:capture] Saved checksums.json');

      const verification = await verifyGoldenDataset();
      manifest = { ...manifest, demoReady: verification.demoReady };
      await writeFile(join(GOLDEN_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
      const manifestBuffer = await import('node:fs').then((fs) =>
        fs.readFileSync(join(GOLDEN_DIR, 'manifest.json')),
      );
      checksums['manifest.json'] = createHash('sha256').update(manifestBuffer).digest('hex');
      await writeFile(join(GOLDEN_DIR, 'checksums.json'), JSON.stringify(checksums, null, 2));

      console.log('[golden:capture] Done!');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('[golden:capture] Error:', err);
      server.close();
      process.exit(1);
    }
  });
}

capture().catch((err) => {
  console.error('[golden:capture] Fatal:', err);
  process.exit(1);
});

async function exportAnalysisImages(analysisId: string): Promise<string[]> {
  const sourceDir = join(process.cwd(), 'storage', 'analyses', analysisId);
  const targetDir = join(GOLDEN_DIR, 'images');
  await mkdir(targetDir, { recursive: true });
  const names = ['true-color.png', 'ndvi.png', 'ndmi.png', 'bsi.png'];
  const exported: string[] = [];
  for (const name of names) {
    try {
      await access(join(sourceDir, name));
      await copyFile(join(sourceDir, name), join(targetDir, name));
      exported.push(`images/${name}`);
    } catch {
      // Best-effort export. Verification decides demo readiness.
    }
  }
  return exported;
}
