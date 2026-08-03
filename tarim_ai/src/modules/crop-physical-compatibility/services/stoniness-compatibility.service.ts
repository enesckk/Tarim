import type { PhysicalRequirements } from '../schemas/physical-requirements.schema.js';
import {
  bedrockClassOrder,
  isAtLeast,
  isAtMost,
  machineAccessClassOrder,
  stoninessClassOrder,
} from './crop-requirement-resolution.service.js';
import type {
  CompatibilityComponentResult,
  MechanizationCompatibilityResult,
  ParcelPhysicalEvidence,
} from '../types/crop-physical-compatibility.types.js';

export class StoninessCompatibilityService {
  evaluate(
    requirements: PhysicalRequirements,
    evidence: ParcelPhysicalEvidence,
  ): CompatibilityComponentResult {
    const req = requirements.surfaceStoninessTolerance;
    const observed = evidence.field?.surfaceStoniness ?? null;

    if (observed == null || observed === 'unknown') {
      return {
        classification: 'unknown',
        importance: req.importance,
        observedValue: observed,
        requirement: { ...req },
        source: 'unavailable',
        sourceType: 'unknown',
        confidence: 'unknown',
        matchedRule: 'FIELD_STONINESS_UNKNOWN',
        message:
          'Yüzey taşlılığı saha ile doğrulanmamış; BSI/probable rock yerine geçmez.',
      };
    }

    const base = {
      importance: req.importance,
      observedValue: observed,
      requirement: { ...req },
      source: 'approved_field_survey',
      sourceType: 'field_measurement' as const,
      confidence: 'medium' as const,
    };

    if (isAtMost(stoninessClassOrder, observed, req.preferredMaximum)) {
      return {
        ...base,
        classification: 'preferred',
        matchedRule: 'STONINESS_WITHIN_PREFERRED',
        message: `Saha taşlılığı (${observed}) preferred maksimumun içinde.`,
      };
    }
    if (isAtMost(stoninessClassOrder, observed, req.acceptableMaximum)) {
      return {
        ...base,
        classification: 'acceptable',
        matchedRule: 'STONINESS_WITHIN_ACCEPTABLE',
        message: `Saha taşlılığı (${observed}) acceptable maksimumun içinde.`,
      };
    }
    if (isAtMost(stoninessClassOrder, observed, req.maximum)) {
      return {
        ...base,
        classification: 'limited',
        matchedRule: 'STONINESS_ABOVE_ACCEPTABLE_WITHIN_MAXIMUM',
        message: `Saha taşlılığı (${observed}) acceptable üzeri fakat maximum içinde.`,
      };
    }
    return {
      ...base,
      classification: 'strongly_limited',
      matchedRule: 'STONINESS_ABOVE_MAXIMUM_FIELD',
      message: `Saha taşlılığı (${observed}) ürün maksimum toleransının üzerindedir.`,
    };
  }
}

export class BedrockCompatibilityService {
  evaluate(
    requirements: PhysicalRequirements,
    evidence: ParcelPhysicalEvidence,
  ): CompatibilityComponentResult {
    const req = requirements.bedrockOutcropTolerance;
    const observed = evidence.field?.bedrockOutcrop ?? null;

    if (observed == null || observed === 'unknown') {
      return {
        classification: 'unknown',
        importance: req.importance,
        observedValue: observed,
        requirement: { ...req },
        source: 'unavailable',
        sourceType: 'unknown',
        confidence: 'unknown',
        matchedRule: 'FIELD_BEDROCK_UNKNOWN',
        message: 'Kaya çıkışı saha gözlemi yok.',
      };
    }

    const base = {
      importance: req.importance,
      observedValue: observed,
      requirement: { ...req },
      source: 'approved_field_survey',
      sourceType: 'field_measurement' as const,
      confidence: 'medium' as const,
    };

    if (observed === 'not_observed') {
      return {
        ...base,
        classification: 'preferred',
        matchedRule: 'BEDROCK_NOT_OBSERVED_AT_SAMPLES',
        message:
          'Örnek noktalarında kaya çıkışı gözlenmedi; bu “bedrock kesin yok” anlamına gelmez.',
      };
    }

    if (isAtMost(bedrockClassOrder, observed, req.preferredMaximum)) {
      return {
        ...base,
        classification: 'preferred',
        matchedRule: 'BEDROCK_WITHIN_PREFERRED',
        message: `Bedrock (${observed}) preferred tolerans içinde.`,
      };
    }
    if (isAtMost(bedrockClassOrder, observed, req.acceptableMaximum)) {
      return {
        ...base,
        classification: 'caution',
        matchedRule: 'BEDROCK_WITHIN_ACCEPTABLE',
        message: `Bedrock (${observed}) acceptable tolerans sınırında.`,
      };
    }
    if (isAtMost(bedrockClassOrder, observed, req.maximum)) {
      return {
        ...base,
        classification: 'limited',
        matchedRule: 'BEDROCK_WITHIN_MAXIMUM',
        message: `Bedrock (${observed}) ürün maksimum toleransına yakın.`,
      };
    }
    if (observed === 'extensive') {
      return {
        ...base,
        classification: 'strongly_limited',
        matchedRule: 'BEDROCK_EXTENSIVE_FIELD',
        message: 'Yaygın kaya çıkışı saha ile doğrulanmıştır.',
      };
    }
    return {
      ...base,
      classification: 'limited',
      matchedRule: 'BEDROCK_ABOVE_MAXIMUM',
      message: `Bedrock (${observed}) ürün toleransının üzerindedir.`,
    };
  }
}

export class MechanizationCompatibilityService {
  evaluate(
    requirements: PhysicalRequirements,
    evidence: ParcelPhysicalEvidence,
  ): MechanizationCompatibilityResult {
    const req = requirements.machineAccessRequirement;
    const fieldAccess = evidence.field?.machineAccess ?? null;
    const terrainMech =
      evidence.terrainReal && !evidence.terrainMock
        ? evidence.terrain?.mechanization ?? null
        : null;

    const terrainBlock = {
      classification: terrainMech,
      source: evidence.terrain?.provider ?? 'unavailable',
    };
    const fieldBlock = {
      classification: fieldAccess,
      source: fieldAccess ? 'approved_field_survey' : 'unavailable',
    };

    let conflict = false;
    let combined: CompatibilityComponentResult['classification'] = 'unknown';
    let matchedRule = 'MECHANIZATION_UNKNOWN';
    let message = 'Mekanizasyon / makine erişimi değerlendirilemedi.';
    let confidence: CompatibilityComponentResult['confidence'] = 'unknown';
    let source = 'unavailable';
    let sourceType = 'unknown';

    const fieldKnown = fieldAccess != null && fieldAccess !== 'unknown';
    const terrainKnown = terrainMech != null && terrainMech !== 'unknown';

    if (fieldKnown) {
      source = 'approved_field_survey';
      sourceType = 'field_measurement';
      confidence = 'medium';
      const meets = isAtLeast(machineAccessClassOrder, fieldAccess, req.minimum);
      // machineAccessClassOrder: lower index = better. isAtLeast: observed rank <= minimum rank means observed is as good or better
      if (fieldAccess === 'impossible') {
        combined = 'strongly_limited';
        matchedRule = 'FIELD_MACHINE_ACCESS_IMPOSSIBLE';
        message = 'Saha makine erişimi impossible olarak doğrulanmıştır.';
      } else if (meets) {
        combined = 'preferred';
        matchedRule = 'FIELD_MACHINE_ACCESS_MEETS_MINIMUM';
        message = `Saha makine erişimi (${fieldAccess}) ürün minimumunu karşılar.`;
      } else {
        combined = 'limited';
        matchedRule = 'FIELD_MACHINE_ACCESS_BELOW_MINIMUM';
        message = `Saha makine erişimi (${fieldAccess}) ürün minimumunun altında.`;
      }
    } else if (terrainKnown) {
      source = evidence.terrain!.provider;
      sourceType = 'real_dem';
      confidence =
        evidence.terrain?.spatialConfidence === 'high' ||
        evidence.terrain?.spatialConfidence === 'medium'
          ? (evidence.terrain.spatialConfidence as 'high' | 'medium')
          : 'low';
      if (terrainMech === 'suitable' || terrainMech === 'partially_suitable') {
        combined = terrainMech === 'suitable' ? 'preferred' : 'acceptable';
        matchedRule = 'TERRAIN_MECHANIZATION_FAVORABLE';
        message = `Terrain mekanizasyon (${terrainMech}); saha erişimi doğrulanmamış.`;
      } else if (terrainMech === 'limited') {
        combined = 'caution';
        matchedRule = 'TERRAIN_MECHANIZATION_LIMITED';
        message = 'Terrain mekanizasyon limited; saha erişimi doğrulanmalı.';
      } else if (terrainMech === 'strongly_limited') {
        combined = 'limited';
        matchedRule = 'TERRAIN_MECHANIZATION_STRONGLY_LIMITED';
        message = 'Terrain mekanizasyon strongly_limited.';
      }
    }

    // Conflicts
    if (
      fieldKnown &&
      terrainKnown &&
      (terrainMech === 'suitable' || terrainMech === 'partially_suitable') &&
      fieldAccess === 'impossible'
    ) {
      conflict = true;
      combined = 'strongly_limited';
      matchedRule = 'TERRAIN_FIELD_MECHANIZATION_CONFLICT';
      message =
        'Terrain suitable iken saha access impossible; field evidence öncelikli.';
    } else if (
      fieldKnown &&
      terrainKnown &&
      (terrainMech === 'limited' || terrainMech === 'strongly_limited') &&
      (fieldAccess === 'verified_accessible' ||
        fieldAccess === 'accessible_with_limitations')
    ) {
      conflict = true;
      // Field accessible does not erase terrain topographic limitation
      if (combined === 'preferred' || combined === 'acceptable') {
        combined = 'caution';
      }
      matchedRule = 'TERRAIN_FIELD_MECHANIZATION_CONFLICT';
      message =
        'Terrain limited/strongly_limited iken saha accessible; topoğrafik kısıt silinmez.';
    }

    const component: CompatibilityComponentResult = {
      classification: combined,
      importance: req.importance,
      observedValue: {
        terrainMechanization: terrainMech,
        fieldVerifiedMachineAccess: fieldAccess,
        conflict,
      },
      requirement: { ...req },
      source,
      sourceType,
      confidence,
      matchedRule,
      message,
    };

    return {
      terrain: terrainBlock,
      fieldAccess: fieldBlock,
      combined,
      conflict,
      component,
    };
  }
}

export class DrainageCompatibilityService {
  evaluate(
    requirements: PhysicalRequirements,
    evidence: ParcelPhysicalEvidence,
  ): CompatibilityComponentResult {
    const req = requirements.drainageRequirement;
    const observed = evidence.field?.drainage ?? null;

    if (observed == null || observed === 'unknown') {
      return {
        classification: 'unknown',
        importance: req.importance,
        observedValue: observed,
        requirement: { ...req },
        source: 'unavailable',
        sourceType: 'unknown',
        confidence: 'unknown',
        matchedRule: 'FIELD_DRAINAGE_UNKNOWN',
        message: 'Drenaj saha gözlemi yok; SoilGrids drainage uydurulmaz.',
      };
    }

    const base = {
      importance: req.importance,
      observedValue: observed,
      requirement: { ...req },
      source: 'approved_field_survey',
      sourceType: 'field_measurement' as const,
      confidence: 'medium' as const,
    };

    if (req.preferred.includes(observed as never)) {
      return {
        ...base,
        classification: 'preferred',
        matchedRule: 'DRAINAGE_PREFERRED',
        message: `Drenaj (${observed}) preferred listede.`,
      };
    }
    if (req.acceptable.includes(observed as never)) {
      return {
        ...base,
        classification: 'acceptable',
        matchedRule: 'DRAINAGE_ACCEPTABLE',
        message: `Drenaj (${observed}) acceptable listede.`,
      };
    }
    if (req.notPreferred.includes(observed as never)) {
      return {
        ...base,
        classification:
          observed === 'waterlogging_observed' || observed === 'poor'
            ? 'limited'
            : 'caution',
        matchedRule: 'DRAINAGE_NOT_PREFERRED',
        message: `Drenaj (${observed}) ürün için tercih edilmez.`,
      };
    }
    return {
      ...base,
      classification: 'caution',
      matchedRule: 'DRAINAGE_UNLISTED',
      message: `Drenaj (${observed}) requirement listelerinde yok.`,
    };
  }
}
