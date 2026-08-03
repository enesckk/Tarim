import { seedCropPhenologyEngine } from '../phenology/crop-phenology-engine.service.js';

/** @deprecated Prefer seedCropPhenologyEngine */
export async function seedPhenologyStages(
  ...args: Parameters<typeof seedCropPhenologyEngine>
) {
  return seedCropPhenologyEngine(...args);
}

export { seedCropPhenologyEngine };
