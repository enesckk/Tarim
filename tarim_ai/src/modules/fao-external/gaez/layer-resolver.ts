import type { GaezDataset, GaezLayerDefinition } from '../types/models.js';
import { datasetToLayer } from './core.js';

export type LayerKind = 'suitability_class' | 'attainable_yield' | 'potential_yield' | 'other';

export function classifyGaezVariable(variable: string | null | undefined): LayerKind {
  const v = (variable ?? '').toLowerCase();
  if (!v) return 'other';
  if (v.includes('suitability index') && v.includes('class')) return 'suitability_class';
  if (v.includes('attainable yield')) return 'attainable_yield';
  if (v.includes('potential') && v.includes('yield')) return 'potential_yield';
  if (v.includes('output density') && v.includes('potential')) return 'potential_yield';
  return 'other';
}

export function isRainfed(waterSupply: string | null | undefined): boolean {
  return (waterSupply ?? '').toLowerCase().includes('rain');
}

export function isIrrigated(waterSupply: string | null | undefined): boolean {
  const w = (waterSupply ?? '').toLowerCase();
  return w.includes('irrig');
}

export type ResolvedPilotLayers = {
  cropCode: string;
  rainfedSuitability: GaezLayerDefinition | null;
  irrigatedSuitability: GaezLayerDefinition | null;
  rainfedAttainableYield: GaezLayerDefinition | null;
  irrigatedAttainableYield: GaezLayerDefinition | null;
  potentialYield: GaezLayerDefinition | null;
  rainfedAvailable: boolean;
  irrigatedAvailable: boolean;
  yieldAvailable: boolean;
};

function preferAllLand(layers: GaezLayerDefinition[]): GaezLayerDefinition | null {
  if (!layers.length) return null;
  const allLand = layers.find((l) => (l.variable ?? '').toLowerCase().includes('all land'));
  return allLand ?? layers[0] ?? null;
}

/**
 * Resolves rainfed/irrigated/yield layers for a GAEZ crop label from synced catalog.
 * Does not invent layers — returns null when absent.
 */
export function resolveLayersForCrop(
  cropCode: string,
  datasets: GaezDataset[],
  opts?: { inputLevel?: string },
): ResolvedPilotLayers {
  const inputLevel = opts?.inputLevel ?? 'High';
  const layers = datasets
    .filter((d) => d.cropCode === cropCode && d.active)
    .filter((d) => !d.inputLevel || d.inputLevel === inputLevel || inputLevel === '*')
    .map(datasetToLayer);

  const suitability = layers.filter((l) => classifyGaezVariable(l.variable) === 'suitability_class');
  const attainable = layers.filter((l) => classifyGaezVariable(l.variable) === 'attainable_yield');
  const potential = layers.filter((l) => classifyGaezVariable(l.variable) === 'potential_yield');

  const rainfedSuitability = preferAllLand(suitability.filter((l) => isRainfed(l.waterSupply)));
  const irrigatedSuitability = preferAllLand(suitability.filter((l) => isIrrigated(l.waterSupply)));
  const rainfedAttainableYield = preferAllLand(attainable.filter((l) => isRainfed(l.waterSupply)));
  const irrigatedAttainableYield = preferAllLand(
    attainable.filter((l) => isIrrigated(l.waterSupply)),
  );
  const potentialYield = preferAllLand(potential);

  return {
    cropCode,
    rainfedSuitability,
    irrigatedSuitability,
    rainfedAttainableYield,
    irrigatedAttainableYield,
    potentialYield,
    rainfedAvailable: Boolean(rainfedSuitability),
    irrigatedAvailable: Boolean(irrigatedSuitability),
    yieldAvailable: Boolean(
      rainfedAttainableYield || irrigatedAttainableYield || potentialYield,
    ),
  };
}

/** GAEZ class index (approx) → label */
export function suitabilityIndexToClass(value: number | null): string | null {
  if (value == null || Number.isNaN(value)) return null;
  // Common GAEZ class rasters use 1..9 style codes
  const n = Math.round(value);
  const map: Record<number, string> = {
    1: 'VS',
    2: 'S',
    3: 'MS',
    4: 'mS',
    5: 'mS',
    6: 'NS',
    7: 'NS',
    8: 'NS',
    9: 'NS',
  };
  return map[n] ?? `class_${n}`;
}
