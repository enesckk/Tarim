import { readFile, access, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { getGoldenDatasetPath } from './golden-loader.js';

export interface VerificationResult {
  structurallyValid: boolean;
  demoReady: boolean;
  level: 'STRUCTURALLY_VALID_NOT_DEMO_READY' | 'DEMO_READY' | 'INVALID';
  errors: string[];
  warnings: string[];
  checks: Array<{ check: string; passed: boolean; detail?: string }>;
  manifest: {
    datasetType: string;
    demoReady: boolean;
    capturedAt: string | null;
    sourceMode: string | null;
  };
}

const EXPECTED_FILES = [
  'manifest.json',
  'final-analysis.json',
  'checksums.json',
];

const IMAGE_KEYS = ['trueColor', 'ndvi', 'ndmi', 'bsi'] as const;
const IMAGE_ALIASES: Record<(typeof IMAGE_KEYS)[number], string[]> = {
  trueColor: ['true-color', 'truecolor', 'true_color', 'trueColor'],
  ndvi: ['ndvi'],
  ndmi: ['ndmi'],
  bsi: ['bsi'],
};

function emptyManifestMeta(): VerificationResult['manifest'] {
  return {
    datasetType: 'unknown',
    demoReady: false,
    capturedAt: null,
    sourceMode: null,
  };
}

function isPlaceholderManifest(manifest: Record<string, unknown>): boolean {
  return (
    manifest.datasetType === 'placeholder' ||
    manifest.status === 'placeholder'
  );
}

function matchImageName(fileName: string, key: (typeof IMAGE_KEYS)[number]): boolean {
  const lower = fileName.toLowerCase().replace(/\\/g, '/');
  const base = lower.split('/').pop() ?? lower;
  return IMAGE_ALIASES[key].some((alias) => {
    const a = alias.toLowerCase();
    return base.includes(a) || lower.includes(`/${a}`);
  });
}

function isLocalRelativePath(path: string): boolean {
  if (!path || path.startsWith('http://') || path.startsWith('https://')) {
    return false;
  }
  if (path.startsWith('/api/')) {
    return false;
  }
  return true;
}

async function fileNonEmpty(dir: string, relativePath: string): Promise<boolean> {
  try {
    const s = await stat(join(dir, relativePath));
    return s.size > 0;
  } catch {
    return false;
  }
}

function collectCandidatePaths(
  key: (typeof IMAGE_KEYS)[number],
  manifest: Record<string, unknown>,
  analysis: Record<string, unknown>,
): string[] {
  const candidates: string[] = [];
  const images = (manifest.images as string[]) ?? [];
  for (const img of images) {
    if (typeof img === 'string' && matchImageName(img, key)) {
      candidates.push(img);
    }
  }

  const satellite = analysis.satellite as Record<string, unknown> | null | undefined;
  const selected = satellite?.selectedObservation as Record<string, unknown> | null | undefined;
  if (selected) {
    const layer = selected[key] as { imageUrl?: string } | null | undefined;
    const url = layer?.imageUrl;
    if (typeof url === 'string' && isLocalRelativePath(url)) {
      candidates.push(url.replace(/^\.\//, ''));
    }
  }

  for (const alias of IMAGE_ALIASES[key]) {
    candidates.push(`${alias}.png`);
    candidates.push(`images/${alias}.png`);
  }

  return [...new Set(candidates)];
}

export async function verifyGoldenDataset(): Promise<VerificationResult> {
  const dir = getGoldenDatasetPath();
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: Array<{ check: string; passed: boolean; detail?: string }> = [];
  let manifestMeta = emptyManifestMeta();
  let structuralErrors = 0;

  const failStructural = (message: string, check: string, detail?: string) => {
    errors.push(message);
    checks.push({ check, passed: false, detail });
    structuralErrors += 1;
  };

  try {
    await access(dir);
    checks.push({ check: 'directory_exists', passed: true });
  } catch {
    failStructural(`Golden dataset directory not found: ${dir}`, 'directory_exists', dir);
    return {
      structurallyValid: false,
      demoReady: false,
      level: 'INVALID',
      errors,
      warnings,
      checks,
      manifest: manifestMeta,
    };
  }

  for (const file of EXPECTED_FILES) {
    try {
      await access(join(dir, file));
      checks.push({ check: `file_exists:${file}`, passed: true });
    } catch {
      failStructural(`Missing file: ${file}`, `file_exists:${file}`);
    }
  }

  let manifest: Record<string, unknown> = {};
  try {
    const raw = await readFile(join(dir, 'manifest.json'), 'utf-8');
    manifest = JSON.parse(raw) as Record<string, unknown>;
    checks.push({ check: 'manifest_valid_json', passed: true });
    manifestMeta = {
      datasetType: typeof manifest.datasetType === 'string' ? manifest.datasetType : 'unknown',
      demoReady: manifest.demoReady === true,
      capturedAt:
        typeof manifest.capturedAt === 'string' || manifest.capturedAt === null
          ? (manifest.capturedAt as string | null)
          : null,
      sourceMode:
        typeof manifest.sourceMode === 'string' || manifest.sourceMode === null
          ? (manifest.sourceMode as string | null)
          : null,
    };
  } catch {
    failStructural('manifest.json is not valid JSON', 'manifest_valid_json');
  }

  const placeholder = Object.keys(manifest).length > 0 && isPlaceholderManifest(manifest);
  let analysis: Record<string, unknown> | null = null;

  try {
    const raw = await readFile(join(dir, 'final-analysis.json'), 'utf-8');
    analysis = JSON.parse(raw) as Record<string, unknown>;
    checks.push({ check: 'final_analysis_valid_json', passed: true });
  } catch {
    failStructural('final-analysis.json is not valid JSON', 'final_analysis_valid_json');
  }

  if (analysis) {
    if (analysis.parcel) {
      checks.push({ check: 'parcel_present', passed: true });
    } else {
      failStructural('final-analysis.json missing parcel data', 'parcel_present');
    }
  }

  // Checksums are required for structural validity
  try {
    const raw = await readFile(join(dir, 'checksums.json'), 'utf-8');
    const checksums = JSON.parse(raw) as Record<string, string>;
    checks.push({ check: 'checksums_valid_json', passed: true });

    for (const [file, expectedHash] of Object.entries(checksums)) {
      try {
        const content = await readFile(join(dir, file));
        const actualHash = createHash('sha256').update(content).digest('hex');
        if (actualHash === expectedHash) {
          checks.push({ check: `checksum:${file}`, passed: true });
        } else {
          failStructural(`Checksum mismatch: ${file}`, `checksum:${file}`);
        }
      } catch {
        failStructural(`Cannot read file for checksum: ${file}`, `checksum:${file}`);
      }
    }
  } catch {
    failStructural('checksums.json is not valid JSON', 'checksums_valid_json');
  }

  // Demo-readiness checks (do not force INVALID for placeholder gaps)
  const demoFailures: string[] = [];
  const requireDemo = (
    passed: boolean,
    check: string,
    failMessage: string,
    detail?: string,
  ) => {
    checks.push({ check, passed, detail });
    if (!passed) {
      demoFailures.push(failMessage);
      if (!placeholder) {
        warnings.push(failMessage);
      }
    }
  };

  const parcel = (analysis?.parcel ?? null) as Record<string, unknown> | null;
  const geometry = parcel?.geometry as { type?: unknown; coordinates?: unknown } | null | undefined;
  const hasGeometry =
    !!geometry &&
    typeof geometry.type === 'string' &&
    geometry.type.length > 0 &&
    geometry.coordinates != null;
  requireDemo(
    hasGeometry,
    'parcel_geometry',
    'Real parcel geometry (type + coordinates) required for DEMO_READY',
  );

  const area = parcel?.areaSquareMeters;
  requireDemo(
    typeof area === 'number' && area > 0,
    'area_square_meters',
    'areaSquareMeters > 0 required for DEMO_READY',
    typeof area === 'number' ? String(area) : String(area),
  );

  const satellite = (analysis?.satellite ?? null) as Record<string, unknown> | null;
  const candidateCount = satellite?.candidateObservationCount;
  requireDemo(
    typeof candidateCount === 'number' && candidateCount > 0,
    'candidate_observation_count',
    'candidateObservationCount > 0 required for DEMO_READY',
    String(candidateCount),
  );

  const usableCount = satellite?.usableObservationCount;
  requireDemo(
    typeof usableCount === 'number' && usableCount > 0,
    'usable_observation_count',
    'usableObservationCount > 0 required for DEMO_READY',
    String(usableCount),
  );

  for (const key of IMAGE_KEYS) {
    const candidates = collectCandidatePaths(key, manifest, analysis ?? {});
    let found: string | null = null;
    for (const candidate of candidates) {
      if (await fileNonEmpty(dir, candidate)) {
        found = candidate;
        break;
      }
    }
    requireDemo(
      found !== null,
      `image_valid:${key}`,
      `${key} image missing or empty (required for DEMO_READY)`,
      found ?? undefined,
    );
  }

  requireDemo(
    analysis?.terrain != null,
    'terrain_present',
    'terrain result required for DEMO_READY',
  );

  const crops = analysis?.cropRecommendations;
  const cropList = Array.isArray(crops) ? crops : [];
  requireDemo(
    cropList.length > 0,
    'crop_recommendations_present',
    'cropRecommendations must be non-empty for DEMO_READY',
    placeholder ? 'skipped strict failure for placeholder' : `${cropList.length} crops`,
  );

  const topFive = cropList.filter(
    (c) =>
      typeof c === 'object' &&
      c !== null &&
      (c as { isTopFive?: boolean }).isTopFive === true,
  );
  const topFiveEffective = topFive.length > 0 ? topFive : cropList.slice(0, 5);
  requireDemo(
    topFiveEffective.length > 0,
    'top_five_present',
    'Top-5 recommendations must be non-empty for DEMO_READY',
  );

  requireDemo(
    analysis?.recommendationsArePreliminary === true,
    'recommendations_preliminary',
    'recommendationsArePreliminary must be true for DEMO_READY',
  );

  const checksumOk = checks
    .filter((c) => c.check.startsWith('checksum:') || c.check === 'checksums_valid_json')
    .every((c) => c.passed);
  requireDemo(checksumOk, 'checksums_valid_for_demo', 'Valid checksums required for DEMO_READY');

  const capturedDataset = manifest.datasetType === 'captured';

  if (placeholder) {
    checks.push({
      check: 'placeholder_not_demo_ready',
      passed: true,
      detail: 'placeholder datasets cannot be DEMO_READY',
    });
    warnings.push('Golden dataset is placeholder — DEMO_READY=false');
  } else if (!capturedDataset) {
    demoFailures.push("DEMO_READY requires datasetType==='captured'");
    checks.push({
      check: 'manifest_captured_demo_ready',
      passed: false,
      detail: `datasetType=${String(manifest.datasetType)} demoReady=${String(manifest.demoReady)}`,
    });
  } else {
    checks.push({ check: 'manifest_captured_demo_ready', passed: true });
  }

  const structurallyValid = structuralErrors === 0;
  const demoReady =
    structurallyValid &&
    capturedDataset &&
    !placeholder &&
    demoFailures.length === 0;

  let level: VerificationResult['level'];
  if (!structurallyValid) {
    level = 'INVALID';
  } else if (demoReady) {
    level = 'DEMO_READY';
  } else {
    level = 'STRUCTURALLY_VALID_NOT_DEMO_READY';
  }

  return {
    structurallyValid,
    demoReady: placeholder ? false : demoReady,
    level: placeholder
      ? structurallyValid
        ? 'STRUCTURALLY_VALID_NOT_DEMO_READY'
        : 'INVALID'
      : level,
    errors,
    warnings,
    checks,
    manifest: manifestMeta,
  };
}
