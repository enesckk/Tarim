import { readFile, copyFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { AnalysisRequest, AnalysisResultResponse } from '../types/analysis.types.js';

const GOLDEN_DIR = join(
  process.cwd(),
  'fixtures',
  'golden',
  'gungurge-108-7',
);

const IMAGE_LAYERS = [
  { file: 'true-color.png', obsKey: 'trueColor', route: 'true-color' },
  { file: 'ndvi.png', obsKey: 'ndvi', route: 'ndvi' },
  { file: 'ndmi.png', obsKey: 'ndmi', route: 'ndmi' },
  { file: 'bsi.png', obsKey: 'bsi', route: 'bsi' },
] as const;

export async function loadGoldenDataset(
  _request: AnalysisRequest,
): Promise<AnalysisResultResponse> {
  const filePath = join(GOLDEN_DIR, 'final-analysis.json');
  const raw = await readFile(filePath, 'utf-8');
  const data = JSON.parse(raw) as AnalysisResultResponse;
  return data;
}

/**
 * Loads golden JSON, copies PNG layers into storage/analyses/{analysisId},
 * and rewrites imageUrl paths so GET /api/analyses/:id/images/:layer works.
 */
export async function loadGoldenDatasetForAnalysis(
  analysisId: string,
  request: AnalysisRequest,
): Promise<AnalysisResultResponse> {
  const data = structuredClone(await loadGoldenDataset(request));
  data.analysisId = analysisId;

  if (data.parcel) {
    data.parcel.province = request.province;
    data.parcel.district = request.district;
    data.parcel.neighborhood = request.neighborhood;
    data.parcel.block = request.block;
    data.parcel.parcel = request.parcel;
  }

  const targetDir = join(process.cwd(), 'storage', 'analyses', analysisId);
  await mkdir(targetDir, { recursive: true });

  for (const layer of IMAGE_LAYERS) {
    const source = join(GOLDEN_DIR, 'images', layer.file);
    try {
      await access(source);
      await copyFile(source, join(targetDir, layer.file));
    } catch {
      // Layer may be missing in incomplete fixtures; image endpoint will 404.
    }
  }

  const satellite = data.satellite as Record<string, unknown> | null | undefined;
  const observation = satellite?.selectedObservation as
    | Record<string, unknown>
    | undefined;
  if (observation) {
    for (const layer of IMAGE_LAYERS) {
      const block = observation[layer.obsKey];
      if (block && typeof block === 'object') {
        observation[layer.obsKey] = {
          ...(block as Record<string, unknown>),
          imageUrl: `/api/analyses/${analysisId}/images/${layer.route}`,
        };
      }
    }
  }

  enrichLandUsabilityFromTerrain(data);

  return data;
}

/**
 * Golden fixture may store landUsability as insufficient_data even when terrain
 * is clearly available. Normalize to a cautious but usable demo summary so the
 * admin panel always shows concrete elevation/slope-driven usability fields.
 */
function enrichLandUsabilityFromTerrain(data: AnalysisResultResponse): void {
  const current = data.landUsability as
    | (AnalysisResultResponse['landUsability'] & Record<string, unknown>)
    | null
    | undefined;
  if (!current) return;

  const classification = String(current.classification ?? '');
  if (classification && classification !== 'insufficient_data') return;

  const terrain = data.terrain as Record<string, unknown> | null | undefined;
  const slope = (terrain?.slope ?? {}) as Record<string, unknown>;
  const mech = (terrain?.mechanizationSuitability ?? {}) as Record<string, unknown>;
  const slopeClass = String(slope.class ?? 'unknown');
  const mechClass = String(mech.classification ?? 'unknown');
  const meanDegrees =
    typeof slope.meanDegrees === 'number' ? slope.meanDegrees : null;

  const favorableSlope = ['flat', 'gentle', 'moderate'].includes(slopeClass);
  const favorableMech = ['suitable', 'generally_suitable', 'limited'].includes(
    mechClass,
  );

  const positive = Array.isArray(current.positiveFactors)
    ? [...current.positiveFactors]
    : [];
  const limiting = Array.isArray(current.limitingFactors)
    ? [...current.limitingFactors]
    : [];

  if (
    !limiting.some(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'factor' in item &&
        (item as { factor?: string }).factor === 'FIELD_SURVEY_MISSING',
    )
  ) {
    limiting.push({
      factor: 'FIELD_SURVEY_MISSING',
      severity: 'high',
      description:
        'Onaylı saha ölçümü yok; sonuç ön değerlendirme olarak kabul edilmelidir.',
    });
  }

  data.landUsability = {
    ...current,
    classification: favorableSlope
      ? 'recommendation_with_caution'
      : 'insufficient_data',
    score: favorableSlope ? (favorableMech ? 72 : 58) : 0,
    confidence: { level: 'medium' },
    explanation: favorableSlope
      ? `generally_favorable (eğim: ${slopeClass}${meanDegrees != null ? `, ort. ${meanDegrees}°` : ''}; mekanizasyon: ${mechClass})`
      : 'insufficient_data',
    positiveFactors: positive,
    limitingFactors: limiting,
  };
}

export function getGoldenDatasetPath(): string {
  return GOLDEN_DIR;
}
