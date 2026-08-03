import type {
  CompatibilityFactor,
  CropPhysicalCompatibilityAudit,
  CropPhysicalCompatibilityCheck,
  CropPhysicalCompatibilityResult,
  ParcelPhysicalEvidence,
} from '../types/crop-physical-compatibility.types.js';
import type { ResolvedCropRequirements } from './crop-requirement-resolution.service.js';

export class CompatibilityAuditService {
  build(input: {
    cropId: string;
    result: Omit<CropPhysicalCompatibilityResult, 'audit'>;
    existingScore: number | null;
    calibrationVersion: string;
    requirementsKeys: string[];
  }): CropPhysicalCompatibilityAudit {
    const { cropId, result, existingScore, calibrationVersion, requirementsKeys } =
      input;
    return {
      cropId,
      requirementsUsed: requirementsKeys,
      evidenceUsed: [
        ...result.supportingFactors.map((f) => f.code),
        ...result.limitingFactors.map((f) => f.code),
      ],
      evidenceIgnored: result.ignoredEvidence.map((f) => f.code),
      componentRulesEvaluated: Object.values(result.components)
        .map((c) =>
          'matchedRule' in c && typeof (c as { matchedRule?: string }).matchedRule === 'string'
            ? (c as { matchedRule: string }).matchedRule
            : (c as { component?: { matchedRule: string } }).component?.matchedRule,
        )
        .filter((x): x is string => Boolean(x)),
      matchedComponentRules: Object.values(result.components)
        .map((c) =>
          'component' in c
            ? c.component.matchedRule
            : (c as { matchedRule: string }).matchedRule,
        )
        .filter(Boolean),
      overallRulesEvaluated: [],
      matchedOverallRule: {
        code: 'PENDING',
        inputs: {},
        result: result.classification,
      },
      existingScore,
      scoreBefore: existingScore,
      scoreAfter: existingScore,
      recommendationImpactApplied: false,
      calibrationVersion,
    };
  }
}

export class CompatibilityValidationService {
  buildChecks(input: {
    cropId: string;
    resolved: ResolvedCropRequirements;
    result: CropPhysicalCompatibilityResult;
    evidence: ParcelPhysicalEvidence;
  }): CropPhysicalCompatibilityCheck[] {
    const { cropId, resolved, result, evidence } = input;
    const checks: CropPhysicalCompatibilityCheck[] = [];

    checks.push({
      code: 'CROP_PHYSICAL_REQUIREMENTS_AVAILABLE',
      cropId,
      status: resolved.requirements ? 'passed' : 'failed',
      observedValue: Boolean(resolved.requirements),
      source: 'crop-knowledge',
      message: resolved.requirements
        ? 'Fiziksel requirement set mevcut.'
        : 'Fiziksel requirement set yok.',
    });

    checks.push({
      code: 'CROP_PHYSICAL_REQUIREMENTS_COMPLETE',
      cropId,
      status: resolved.complete && resolved.valid ? 'passed' : 'failed',
      observedValue: resolved.complete && resolved.valid,
      source: 'crop-knowledge',
      message: resolved.issues.join('; ') || 'Requirement set complete.',
    });

    checks.push({
      code: 'CROP_PHYSICAL_REQUIREMENTS_UNVALIDATED',
      cropId,
      status: 'warning',
      observedValue: resolved.validationStatus,
      requirement: 'validated',
      source: 'crop-knowledge',
      message: 'Ürün fiziksel requirement seti unvalidated.',
    });

    checks.push({
      code: 'CROP_PHYSICAL_FIELD_EVIDENCE_AVAILABLE',
      cropId,
      status: evidence.field?.rootableSoilDepth?.verified ? 'passed' : 'warning',
      observedValue: evidence.field?.rootableSoilDepth?.verified ?? false,
      source: 'field-survey',
      message: 'Approved field evidence durumu.',
    });

    checks.push({
      code: 'CROP_PHYSICAL_REAL_TERRAIN_AVAILABLE',
      cropId,
      status: evidence.terrainReal && !evidence.terrainMock ? 'passed' : 'warning',
      observedValue: evidence.terrainReal,
      source: evidence.terrain?.provider ?? 'unavailable',
      message: 'Gerçek DEM durumu.',
    });

    const componentCodes: Array<[string, keyof typeof result.components]> = [
      ['CROP_PHYSICAL_DEPTH_EVALUATED', 'rootableSoilDepth'],
      ['CROP_PHYSICAL_SLOPE_EVALUATED', 'slope'],
      ['CROP_PHYSICAL_RUGGEDNESS_EVALUATED', 'ruggedness'],
      ['CROP_PHYSICAL_STONINESS_EVALUATED', 'surfaceStoniness'],
      ['CROP_PHYSICAL_BEDROCK_EVALUATED', 'bedrockOutcrop'],
      ['CROP_PHYSICAL_DRAINAGE_EVALUATED', 'drainage'],
    ];

    for (const [code, key] of componentCodes) {
      const comp = result.components[key] as { classification: string; source: string };
      checks.push({
        code,
        cropId,
        status: comp.classification === 'unknown' ? 'warning' : 'passed',
        observedValue: comp.classification,
        source: comp.source,
        message: `${key} evaluated.`,
      });
    }

    checks.push({
      code: 'CROP_PHYSICAL_MACHINE_ACCESS_EVALUATED',
      cropId,
      status:
        result.components.mechanization.combined === 'unknown' ? 'warning' : 'passed',
      observedValue: result.components.mechanization.combined,
      source: 'mechanization',
      message: 'Mechanization compatibility evaluated.',
    });

    checks.push({
      code: 'CROP_PHYSICAL_COMPATIBILITY_DETERMINED',
      cropId,
      status: 'passed',
      observedValue: result.classification,
      source: 'compatibility-engine',
      message: 'Overall physical compatibility determined.',
    });

    checks.push({
      code: 'CROP_PHYSICAL_RECOMMENDATION_SCORE_UNCHANGED',
      cropId,
      status:
        result.audit.scoreBefore === result.audit.scoreAfter ? 'passed' : 'failed',
      observedValue: result.audit.scoreAfter,
      requirement: result.audit.scoreBefore,
      source: 'invariant',
      message: 'recommendationImpactApplied=false; score unchanged.',
    });

    checks.push({
      code: 'CROP_PHYSICAL_CALIBRATION_UNVALIDATED',
      cropId,
      status: 'warning',
      observedValue: 'unvalidated',
      requirement: 'validated',
      source: 'calibration',
      message: 'Crop physical compatibility calibration unvalidated.',
    });

    checks.push({
      code: 'MOCK_EVIDENCE_EXCLUDED_FROM_CROP_COMPATIBILITY',
      cropId,
      status: 'passed',
      observedValue: result.ignoredEvidence.map((e) => e.code).join(',') || 'none',
      source: 'evidence',
      message: 'Mock evidence excluded from crop physical compatibility.',
    });

    return checks;
  }
}

export function buildConflicts(
  evidence: ParcelPhysicalEvidence,
  mechanizationConflict: boolean,
  depthComponent: { matchedRule: string },
): CompatibilityFactor[] {
  const conflicts: CompatibilityFactor[] = [];

  if (depthComponent.matchedRule === 'VARIABLE_OR_BORDERLINE_DEPTH') {
    conflicts.push({
      code: 'DEPTH_MEASUREMENTS_SPATIALLY_VARIABLE',
      severity: 'important',
      message: 'Derinlik ölçümleri mekânsal değişkenlik gösteriyor.',
    });
  }

  if (mechanizationConflict) {
    conflicts.push({
      code: 'TERRAIN_FIELD_MECHANIZATION_CONFLICT',
      severity: 'important',
      message: 'Terrain mekanizasyon ile saha machine access çelişiyor.',
    });
  }

  const rock = evidence.surface?.probableRockClassification;
  const stone = evidence.field?.surfaceStoniness;
  if (rock === 'low' && (stone === 'high' || stone === 'very_high')) {
    conflicts.push({
      code: 'LOW_REMOTE_ROCK_SIGNAL_BUT_HIGH_FIELD_STONINESS',
      severity: 'important',
      message: 'Düşük remote rock sinyali ile yüksek saha taşlılığı.',
    });
  }
  if (
    (rock === 'high' || rock === 'medium_high') &&
    (stone === 'none' || stone === 'low')
  ) {
    conflicts.push({
      code: 'HIGH_REMOTE_ROCK_SIGNAL_BUT_LOW_FIELD_STONINESS',
      severity: 'important',
      message: 'Yüksek remote rock ile düşük saha taşlılığı.',
    });
  }
  if (
    evidence.field?.bedrockOutcrop === 'not_observed' &&
    (rock === 'high' || rock === 'medium_high')
  ) {
    conflicts.push({
      code: 'FIELD_BEDROCK_NOT_OBSERVED_BUT_REMOTE_SIGNAL_HIGH',
      severity: 'important',
      message:
        'Saha bedrock not_observed; yüksek remote rock bilgilendirici çelişki.',
    });
  }

  if (
    evidence.terrainReal &&
    evidence.field?.rootableSoilDepth?.verified &&
    !mechanizationConflict &&
    conflicts.length === 0
  ) {
    conflicts.push({
      code: 'FIELD_AND_TERRAIN_EVIDENCE_CONSISTENT',
      severity: 'supporting',
      message: 'Saha ve gerçek terrain kanıtları tutarlı görünüyor.',
    });
  }

  return conflicts;
}
