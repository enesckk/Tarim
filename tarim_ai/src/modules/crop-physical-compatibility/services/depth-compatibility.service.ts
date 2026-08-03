import type { PhysicalRequirements } from '../schemas/physical-requirements.schema.js';
import type {
  CompatibilityComponentResult,
  ParcelPhysicalEvidence,
} from '../types/crop-physical-compatibility.types.js';

export class DepthCompatibilityService {
  evaluate(
    requirements: PhysicalRequirements,
    evidence: ParcelPhysicalEvidence,
  ): CompatibilityComponentResult {
    const req = requirements.rootableSoilDepth;
    const depth = evidence.field?.rootableSoilDepth;

    if (!depth?.verified || depth.meanCm == null) {
      return {
        classification: 'unknown',
        importance: req.importance,
        observedValue: depth
          ? {
              minimumCm: depth.minimumCm,
              meanCm: depth.meanCm,
              measurementCount: depth.measurementCount,
            }
          : null,
        requirement: { ...req },
        source: 'unavailable',
        sourceType: 'unknown',
        confidence: 'unknown',
        matchedRule: 'ROOTABLE_DEPTH_UNKNOWN',
        message:
          'Köklenebilir derinlik doğrulanmamış; SoilGrids / tahmini derinlik kullanılmaz.',
      };
    }

    const min = depth.minimumCm;
    const mean = depth.meanCm;
    const median = depth.medianCm;
    const observed = {
      minimumCm: min,
      meanCm: mean,
      medianCm: median,
      measurementCount: depth.measurementCount,
    };

    const base = {
      importance: req.importance,
      observedValue: observed,
      requirement: { ...req },
      source: 'approved_field_measurement',
      sourceType: 'field_measurement' as const,
      confidence: (depth.confidence === 'high' || depth.confidence === 'medium'
        ? depth.confidence
        : 'low') as CompatibilityComponentResult['confidence'],
    };

    // Strongly limited: both min and mean below critical minimum, field verified
    if (
      mean < req.minimumCm &&
      (min == null || min < req.minimumCm) &&
      (depth.confidence === 'medium' || depth.confidence === 'high')
    ) {
      return {
        ...base,
        classification: 'strongly_limited',
        matchedRule: 'MEAN_AND_MIN_BELOW_MINIMUM_FIELD_VERIFIED',
        message: `Ortalama derinlik (${mean} cm) ürün minimumunun (${req.minimumCm} cm) altındadır.`,
      };
    }

    if (mean < req.minimumCm) {
      return {
        ...base,
        classification: 'limited',
        matchedRule: 'MEAN_BELOW_MINIMUM',
        message: `Ortalama derinlik (${mean} cm) minimum gereksinimin (${req.minimumCm} cm) altındadır.`,
      };
    }

    if (min != null && min < req.minimumCm && mean >= req.preferredMinimumCm) {
      return {
        ...base,
        classification: 'caution',
        matchedRule: 'MEAN_ABOVE_PREFERRED_BUT_MIN_BELOW_MINIMUM',
        message:
          'Ortalama preferred üzerinde ancak minimum ölçüm ürün minimumunun altında (lokal kısıt).',
      };
    }

    if (min != null && min < req.preferredMinimumCm && mean >= req.preferredMinimumCm) {
      return {
        ...base,
        classification: 'caution',
        matchedRule: 'VARIABLE_OR_BORDERLINE_DEPTH',
        message:
          'Minimum preferred altında, ortalama preferred üzerinde (mekânsal değişkenlik).',
      };
    }

    if (mean >= req.optimalMinimumCm && (min == null || min >= req.optimalMinimumCm)) {
      return {
        ...base,
        classification: 'preferred',
        matchedRule: 'MIN_AND_MEAN_AT_OR_ABOVE_OPTIMAL',
        message: 'Minimum ve ortalama optimal derinliğin üzerindedir.',
      };
    }

    if (mean >= req.preferredMinimumCm && (min == null || min >= req.minimumCm)) {
      return {
        ...base,
        classification: 'acceptable',
        matchedRule: 'MEAN_ABOVE_PREFERRED',
        message: 'Ortalama preferred derinliğin üzerindedir.',
      };
    }

    // mean >= minimum but below preferred
    return {
      ...base,
      classification: 'caution',
      matchedRule: 'MEAN_ABOVE_MINIMUM_BUT_BELOW_PREFERRED',
      message: `Ortalama (${mean} cm) minimumu karşılar fakat preferred (${req.preferredMinimumCm} cm) altındadır.`,
    };
  }
}
