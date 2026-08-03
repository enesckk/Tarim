import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { AnalysisResultResponse } from '../types/analysis.types.js';

export type LandAnalysisCacheEntry = {
  landId: string | null;
  analysisId: string;
  status: string;
  completedAt: string | null;
  parcel: {
    province: string;
    district: string;
    neighborhood: string;
    block: string;
    parcel: string;
  };
  summary: {
    landUsabilityClassification: string | null;
    landUsabilityScore: number | null;
    landUsabilityExplanation: string | null;
    confidenceLevel: string | null;
    topCrops: Array<{ cropName: string; score: number; rank: number }>;
    ndviMean: number | null;
    limitations: string[];
    /** Compact echo of manual soil/water form for past-test lists. */
    applicantInputs: AnalysisResultResponse['applicantInputs'];
  };
  result: AnalysisResultResponse;
  updatedAt: string;
};

function cacheRoot(): string {
  return join(process.cwd(), 'storage', 'land-analyses');
}

function ensureRoot(): void {
  mkdirSync(cacheRoot(), { recursive: true });
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

export function parcelCacheKey(parcel: {
  province: string;
  district: string;
  neighborhood: string;
  block: string;
  parcel: string;
}): string {
  return [
    normalize(parcel.province),
    normalize(parcel.district),
    normalize(parcel.neighborhood),
    normalize(parcel.block),
    normalize(parcel.parcel),
  ].join('__');
}

function landFile(landId: string): string {
  return join(cacheRoot(), `land_${landId}.json`);
}

function parcelFile(key: string): string {
  const safe = key.replace(/[^a-z0-9_-]+/gi, '_');
  return join(cacheRoot(), `parcel_${safe}.json`);
}

function analysisFile(analysisId: string): string {
  return join(cacheRoot(), `analysis_${analysisId}.json`);
}

function buildSummary(result: AnalysisResultResponse): LandAnalysisCacheEntry['summary'] {
  const lu = result.landUsability;
  const confidence = result.confidence as { level?: unknown } | null | undefined;
  const confLevel =
    typeof confidence?.level === 'string' ? confidence.level : null;
  const stats = result.satellite?.selectedObservation?.ndvi?.statistics as
    | { mean?: number }
    | undefined;
  const ndvi = typeof stats?.mean === 'number' ? stats.mean : null;
  const topCrops = (result.cropRecommendations ?? [])
    .filter((c) => c.isTopFive || c.rank <= 5)
    .slice(0, 5)
    .map((c) => ({
      cropName: c.cropName,
      score: c.score,
      rank: c.rank,
    }));

  return {
    landUsabilityClassification: lu?.classification ?? null,
    landUsabilityScore: typeof lu?.score === 'number' ? lu.score : null,
    landUsabilityExplanation: lu?.explanation ?? null,
    confidenceLevel: confLevel,
    topCrops,
    ndviMean: ndvi,
    limitations: result.limitations ?? [],
    applicantInputs: result.applicantInputs ?? null,
  };
}

function readEntry(path: string): LandAnalysisCacheEntry | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as LandAnalysisCacheEntry;
  } catch {
    return null;
  }
}

export function saveLandAnalysisCache(input: {
  landId?: string | null;
  analysisId: string;
  status: string;
  completedAt: string | null;
  parcel: LandAnalysisCacheEntry['parcel'];
  result: AnalysisResultResponse;
}): LandAnalysisCacheEntry {
  ensureRoot();
  const entry: LandAnalysisCacheEntry = {
    landId: input.landId?.trim() || null,
    analysisId: input.analysisId,
    status: input.status,
    completedAt: input.completedAt,
    parcel: input.parcel,
    summary: buildSummary(input.result),
    result: input.result,
    updatedAt: new Date().toISOString(),
  };

  const payload = `${JSON.stringify(entry, null, 2)}\n`;
  // Always keep a per-analysis snapshot so past tests remain reviewable.
  writeFileSync(analysisFile(input.analysisId), payload, 'utf8');
  writeFileSync(parcelFile(parcelCacheKey(input.parcel)), payload, 'utf8');
  if (entry.landId) {
    writeFileSync(landFile(entry.landId), payload, 'utf8');
  }
  return entry;
}

export function getLandAnalysisCache(opts: {
  landId?: string | null;
  parcel?: LandAnalysisCacheEntry['parcel'] | null;
}): LandAnalysisCacheEntry | null {
  ensureRoot();
  if (opts.landId?.trim()) {
    const byLand = readEntry(landFile(opts.landId.trim()));
    if (byLand) return byLand;
  }
  if (opts.parcel) {
    return readEntry(parcelFile(parcelCacheKey(opts.parcel)));
  }
  return null;
}

/** List cached land analyses — prefers per-analysis snapshots for past-test history. */
export function listLandAnalysisCaches(limit = 100): LandAnalysisCacheEntry[] {
  ensureRoot();
  const files = readdirSync(cacheRoot()).filter((f) => f.endsWith('.json'));
  const analysisFiles = files.filter((f) => f.startsWith('analysis_'));
  const legacyFiles = files.filter(
    (f) => f.startsWith('land_') || f.startsWith('parcel_'),
  );

  const byAnalysisId = new Map<string, LandAnalysisCacheEntry>();

  for (const file of analysisFiles) {
    const entry = readEntry(join(cacheRoot(), file));
    if (!entry?.analysisId) continue;
    const prev = byAnalysisId.get(entry.analysisId);
    if (!prev || String(entry.updatedAt) > String(prev.updatedAt)) {
      byAnalysisId.set(entry.analysisId, entry);
    }
  }

  // Include legacy land/parcel caches only when that analysisId is not already present.
  for (const file of legacyFiles) {
    const entry = readEntry(join(cacheRoot(), file));
    if (!entry?.analysisId) continue;
    if (byAnalysisId.has(entry.analysisId)) continue;
    byAnalysisId.set(entry.analysisId, entry);
  }

  return [...byAnalysisId.values()]
    .sort((a, b) =>
      String(b.completedAt ?? b.updatedAt).localeCompare(
        String(a.completedAt ?? a.updatedAt),
      ),
    )
    .slice(0, limit);
}

export function getLandAnalysisCacheByAnalysisId(
  analysisId: string,
): LandAnalysisCacheEntry | null {
  ensureRoot();
  const direct = readEntry(analysisFile(analysisId));
  if (direct) return direct;

  const files = readdirSync(cacheRoot()).filter((f) => f.endsWith('.json'));
  let best: LandAnalysisCacheEntry | null = null;
  for (const file of files) {
    const entry = readEntry(join(cacheRoot(), file));
    if (!entry || entry.analysisId !== analysisId) continue;
    if (!best || String(entry.updatedAt) > String(best.updatedAt)) best = entry;
  }
  return best;
}
