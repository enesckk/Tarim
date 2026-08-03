import {
  bedrockClassOrder,
  machineAccessClassOrder,
  ruggednessClassOrder,
  stoninessClassOrder,
  tryParsePhysicalRequirements,
  type PhysicalRequirements,
} from '../schemas/physical-requirements.schema.js';
import type { CropKnowledge } from '../../crop-recommendation/knowledge/schemas/crop-knowledge.schema.js';

export interface ResolvedCropRequirements {
  cropId: string;
  complete: boolean;
  valid: boolean;
  requirements: PhysicalRequirements | null;
  issues: string[];
  validationStatus: string;
}

export class CropRequirementResolutionService {
  resolve(crop: CropKnowledge): ResolvedCropRequirements {
    if (crop.physicalRequirements == null) {
      return {
        cropId: crop.id,
        complete: false,
        valid: false,
        requirements: null,
        issues: ['physicalRequirements missing'],
        validationStatus: 'missing',
      };
    }

    const parsed = tryParsePhysicalRequirements(crop.physicalRequirements);
    if (!parsed.ok) {
      return {
        cropId: crop.id,
        complete: false,
        valid: false,
        requirements: null,
        issues: parsed.issues,
        validationStatus: 'invalid',
      };
    }

    return {
      cropId: crop.id,
      complete: true,
      valid: true,
      requirements: parsed.value,
      issues: [],
      validationStatus: parsed.value.validationStatus,
    };
  }
}

export function rankOf(
  order: readonly string[],
  value: string | null | undefined,
): number {
  if (value == null || value === 'unknown') return -1;
  return order.indexOf(value);
}

export function isAtMost(
  order: readonly string[],
  observed: string | null | undefined,
  maximum: string,
): boolean {
  const o = rankOf(order, observed);
  const m = rankOf(order, maximum);
  if (o < 0 || m < 0) return false;
  return o <= m;
}

export function isAtLeast(
  order: readonly string[],
  observed: string | null | undefined,
  minimum: string,
): boolean {
  const o = rankOf(order, observed);
  const m = rankOf(order, minimum);
  if (o < 0 || m < 0) return false;
  return o <= m; // machine access: lower index = better access
}

export {
  bedrockClassOrder,
  machineAccessClassOrder,
  ruggednessClassOrder,
  stoninessClassOrder,
};
