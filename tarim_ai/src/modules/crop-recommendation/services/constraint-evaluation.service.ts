import type { CropKnowledge, HardConstraintDef } from '../types/crop.types.js';
import type { RecommendationInputSnapshot } from '../types/recommendation.types.js';
import type { EvaluatedConstraint } from '../types/suitability.types.js';
import { penaltyForSeverity } from '../rules/constraint.rules.js';
import type { ConstraintSeverity } from '../rules/scoring-thresholds.js';
import { roundScore } from '../rules/range-scoring.js';

export class ConstraintEvaluationService {
  evaluate(
    crop: CropKnowledge,
    snapshot: RecommendationInputSnapshot,
  ): { constraints: EvaluatedConstraint[]; totalPenalty: number } {
    const triggered: EvaluatedConstraint[] = [];

    for (const rule of crop.hardConstraints) {
      const observed = resolveField(snapshot, rule.field);
      if (observed === undefined) {
        continue;
      }
      if (matchesConstraint(observed, rule)) {
        triggered.push({
          code: rule.code ?? buildCode(rule),
          severity: rule.severity,
          penalty: penaltyForSeverity(rule.severity),
          group: rule.group,
          observedValue: observed as number | string | boolean,
          requiredRange: buildRequiredRange(rule),
          message: rule.message,
        });
      }
    }

    // Also emit salinity group constraint when both EC and risk are elevated,
    // so duplicate group dedupe can collapse related signals.
    const salinityExtras = deriveSalinityGroupConstraints(crop, snapshot);
    for (const extra of salinityExtras) {
      if (!triggered.some((c) => c.code === extra.code)) {
        triggered.push(extra);
      }
    }

    const deduped = dedupeByGroup(triggered);
    const totalPenalty = roundScore(
      deduped.reduce((sum, item) => sum + item.penalty, 0),
    );
    return { constraints: deduped, totalPenalty };
  }
}

export function resolveField(
  snapshot: RecommendationInputSnapshot,
  field: string,
): unknown {
  const map: Record<string, unknown> = {
    'soil.ph': snapshot.soil.soil.ph,
    'soil.electricalConductivityDsM': snapshot.soil.soil.electricalConductivityDsM,
    'soil.salinityRisk': snapshot.soil.soil.salinityRisk,
    'soil.drainage': snapshot.soil.soil.drainage,
    'soil.depthCm': snapshot.soil.soil.depthCm,
    'soil.organicMatterPercent': snapshot.soil.soil.organicMatterPercent,
    'soil.texture': snapshot.soil.soil.texture,
    'climate.frostRisk': snapshot.climate.temperature.frostRisk,
    'climate.extremeHeatRisk': snapshot.climate.temperature.extremeHeatRisk,
    'climate.droughtRisk': snapshot.climate.water.droughtRisk,
    'climate.growingSeasonMeanC': snapshot.climate.temperature.growingSeasonMeanC,
    'climate.annualMaxC': snapshot.climate.temperature.annualMaxC,
    'climate.annualMinC': snapshot.climate.temperature.annualMinC,
  };
  return map[field];
}

export function matchesConstraint(observed: unknown, rule: HardConstraintDef): boolean {
  const { operator, value, valueMax } = rule;
  switch (operator) {
    case 'greater_than':
      return typeof observed === 'number' && typeof value === 'number' && observed > value;
    case 'greater_than_or_equal':
      return typeof observed === 'number' && typeof value === 'number' && observed >= value;
    case 'less_than':
      return typeof observed === 'number' && typeof value === 'number' && observed < value;
    case 'less_than_or_equal':
      return typeof observed === 'number' && typeof value === 'number' && observed <= value;
    case 'equal':
      return observed === value;
    case 'not_equal':
      return observed !== value;
    case 'outside_range':
      return (
        typeof observed === 'number' &&
        typeof value === 'number' &&
        typeof valueMax === 'number' &&
        (observed < value || observed > valueMax)
      );
    case 'inside_range':
      return (
        typeof observed === 'number' &&
        typeof value === 'number' &&
        typeof valueMax === 'number' &&
        observed >= value &&
        observed <= valueMax
      );
    default:
      return false;
  }
}

export function dedupeByGroup(constraints: EvaluatedConstraint[]): EvaluatedConstraint[] {
  const severityRank: Record<ConstraintSeverity, number> = {
    critical: 3,
    major: 2,
    moderate: 1,
  };

  const result: EvaluatedConstraint[] = [];
  const bestByGroup = new Map<string, EvaluatedConstraint>();

  for (const constraint of constraints) {
    if (!constraint.group) {
      result.push(constraint);
      continue;
    }
    const existing = bestByGroup.get(constraint.group);
    if (!existing) {
      bestByGroup.set(constraint.group, constraint);
      continue;
    }
    const existingRank = severityRank[existing.severity];
    const nextRank = severityRank[constraint.severity];
    if (
      nextRank > existingRank ||
      (nextRank === existingRank && constraint.penalty > existing.penalty)
    ) {
      bestByGroup.set(constraint.group, constraint);
    }
  }

  return [...result, ...bestByGroup.values()];
}

function deriveSalinityGroupConstraints(
  crop: CropKnowledge,
  snapshot: RecommendationInputSnapshot,
): EvaluatedConstraint[] {
  const ec = snapshot.soil.soil.electricalConductivityDsM;
  const risk = snapshot.soil.soil.salinityRisk;
  const maxEc = crop.soil.maximumElectricalConductivityDsM;
  const out: EvaluatedConstraint[] = [];

  if (ec != null && ec > maxEc) {
    out.push({
      code: 'SOIL_EC_ABOVE_CROP_LIMIT',
      severity: ec > maxEc * 1.5 ? 'critical' : 'major',
      penalty: penaltyForSeverity(ec > maxEc * 1.5 ? 'critical' : 'major'),
      group: 'SALINITY',
      observedValue: ec,
      requiredRange: { max: maxEc },
      message: 'Elektriksel iletkenlik ürün için tanımlanan üst sınırın üzerindedir.',
    });
  }

  const tolerance = crop.soil.salinityTolerance;
  if (tolerance === 'low' && risk === 'high') {
    out.push({
      code: 'SOIL_SALINITY_RISK_HIGH',
      severity: 'major',
      penalty: penaltyForSeverity('major'),
      group: 'SALINITY',
      observedValue: risk,
      message: 'Yüksek tuzluluk riski ürün toleransına göre önemli bir kısıt oluşturabilir.',
    });
  }

  return out;
}

function buildCode(rule: HardConstraintDef): string {
  return `${rule.field.replace(/\./g, '_').toUpperCase()}_${rule.operator.toUpperCase()}`;
}

function buildRequiredRange(
  rule: HardConstraintDef,
): { min?: number; max?: number } | undefined {
  if (typeof rule.value !== 'number') {
    return undefined;
  }
  if (rule.operator === 'greater_than' || rule.operator === 'greater_than_or_equal') {
    return { max: rule.value };
  }
  if (rule.operator === 'less_than' || rule.operator === 'less_than_or_equal') {
    return { min: rule.value };
  }
  if (rule.valueMax != null) {
    return { min: rule.value, max: rule.valueMax };
  }
  return undefined;
}
