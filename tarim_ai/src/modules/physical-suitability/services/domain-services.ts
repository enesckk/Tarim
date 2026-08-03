import type {
  CriticalBarrierEvaluationResult,
  CriticalBarrierRule,
  DataSourceRecord,
  MissingDataResult,
  RequirementLevel,
  MissingDataBehavior,
  ResolvedCriterionValue,
} from '../types/physical-suitability.types.js';
import type { PhysicalSuitabilityRepository } from '../repositories/physical-suitability.repository.js';
import { DEFAULT_SOURCE_PRIORITY_ORDER } from '../repositories/physical-suitability.repository.js';
import { normalizeCriterionValue } from './unit-conversion.service.js';
import { ApiError } from '../../../utils/api-error.js';

export class CropProfileService {
  constructor(private readonly repo: PhysicalSuitabilityRepository) {}

  listCrops() {
    return this.repo.listCrops();
  }

  async getCrop(idOrCode: string) {
    return (
      (await this.repo.getCropById(idOrCode)) ??
      (await this.repo.getCropByCode(idOrCode))
    );
  }

  async resolveActiveScenario(cropId: string, scenarioCode?: string) {
    const scenarios = (await this.repo.listScenarios(cropId)).filter((s) => s.isActive);
    if (scenarioCode) {
      const found = scenarios.find((s) => s.code === scenarioCode);
      if (!found) {
        throw new ApiError(404, `Production scenario not found: ${scenarioCode}`, {
          code: 'SCENARIO_NOT_FOUND',
        });
      }
      return found;
    }
    if (scenarios.length === 0) {
      throw new ApiError(404, 'No active production scenario for crop', {
        code: 'SCENARIO_NOT_FOUND',
      });
    }
    return scenarios[0]!;
  }
}

export class CriterionCatalogService {
  constructor(private readonly repo: PhysicalSuitabilityRepository) {}

  list() {
    return this.repo.listCriteria();
  }

  async getByCode(code: string) {
    const c = await this.repo.getCriterionByCode(code);
    if (!c) {
      throw new ApiError(404, `Criterion not found: ${code}`, { code: 'CRITERION_NOT_FOUND' });
    }
    return c;
  }

  async assertUnitCompatible(criterionCode: string, fromUnit: string | null) {
    const c = await this.getByCode(criterionCode);
    if (!c.unit) return;
    if (!fromUnit) {
      throw new ApiError(400, `Unit required for criterion ${criterionCode}`, {
        code: 'UNIT_REQUIRED',
      });
    }
    // Conversion validates support
    normalizeCriterionValue({ value: 1, fromUnit, standardUnit: c.unit });
  }
}

export class CropDecisionMatrixService {
  constructor(private readonly repo: PhysicalSuitabilityRepository) {}

  async getMatrix(cropId: string, productionScenarioId: string) {
    const rules = await this.repo.listRules({
      cropId,
      productionScenarioId,
      activeOnly: true,
    });
    const barriers = await this.repo.listBarrierRules({
      cropId,
      productionScenarioId,
      activeOnly: true,
    });
    return { rules, barriers };
  }

  async detectConflicts(cropId: string, productionScenarioId: string) {
    const rules = await this.repo.listRules({
      cropId,
      productionScenarioId,
      activeOnly: true,
    });
    const byKey = new Map<string, number>();
    const conflicts: string[] = [];
    for (const r of rules) {
      const key = `${r.criterionCode}::${r.decisionRole}`;
      byKey.set(key, (byKey.get(key) ?? 0) + 1);
    }
    for (const [key, count] of byKey) {
      if (count > 1) conflicts.push(key);
    }
    return conflicts;
  }

  async upsertRule(
    rule: Parameters<PhysicalSuitabilityRepository['upsertRule']>[0],
    actor: string,
    reason?: string,
  ) {
    if (rule.verificationStatus === 'Approved' && !rule.sourceReferenceId) {
      throw new ApiError(400, 'Approved rules require a source reference', {
        code: 'SOURCE_REQUIRED',
      });
    }
    const saved = await this.repo.upsertRule(rule);
    await this.repo.appendAudit({
      id: cryptoRandom(),
      entityType: 'CropCriterionRule',
      entityId: saved.id,
      action: 'upsert',
      actor,
      previousValue: null,
      newValue: saved,
      reason: reason ?? null,
      version: saved.version,
      createdAt: new Date().toISOString(),
    });
    return saved;
  }

  async deactivateRule(id: string, actor: string, reason?: string) {
    const previous = await this.repo.getRuleById(id);
    const saved = await this.repo.deactivateRule(id);
    if (!saved) {
      throw new ApiError(404, 'Rule not found', { code: 'RULE_NOT_FOUND' });
    }
    await this.repo.appendAudit({
      id: cryptoRandom(),
      entityType: 'CropCriterionRule',
      entityId: id,
      action: 'deactivate',
      actor,
      previousValue: previous,
      newValue: saved,
      reason: reason ?? null,
      version: saved.version,
      createdAt: new Date().toISOString(),
    });
    return saved;
  }
}

function cryptoRandom(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;
}

export class DataSourceResolutionService {
  constructor(private readonly repo: PhysicalSuitabilityRepository) {}

  async resolve(
    criterionCode: string,
    candidates: DataSourceRecord[],
  ): Promise<ResolvedCriterionValue> {
    if (candidates.length === 0) {
      throw new ApiError(400, 'No data source candidates', { code: 'NO_CANDIDATES' });
    }
    const priorities = await this.repo.listDataSourcePriorities(criterionCode);
    const order =
      priorities.length > 0
        ? priorities.filter((p) => p.isActive).map((p) => p.sourceType)
        : DEFAULT_SOURCE_PRIORITY_ORDER;

    const ranked = [...candidates].sort((a, b) => {
      const ra = order.indexOf(a.sourceType);
      const rb = order.indexOf(b.sourceType);
      const pa = ra === -1 ? 999 : ra;
      const pb = rb === -1 ? 999 : rb;
      if (pa !== pb) return pa - pb;
      // Prefer verified, then newer observation
      if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
      return String(b.observationDate ?? '').localeCompare(String(a.observationDate ?? ''));
    });

    const selected = ranked[0]!;
    const criterion = await this.repo.getCriterionByCode(criterionCode);
    const normalized = normalizeCriterionValue({
      value: selected.originalValue,
      fromUnit: selected.originalUnit,
      standardUnit: criterion?.unit ?? selected.unit,
    });
    selected.normalizedValue = normalized;
    selected.unit = criterion?.unit ?? selected.unit;

    return {
      criterionCode,
      selected,
      candidates: ranked,
      selectionReason: `Selected ${selected.sourceType}/${selected.provider} by priority rank and verification.`,
    };
  }
}

export class MissingDataEvaluationService {
  evaluate(input: {
    criterionCode: string;
    requirementLevel: RequirementLevel;
    missingDataBehavior: MissingDataBehavior;
    observedValue: unknown;
  }): MissingDataResult | null {
    if (input.observedValue !== null && input.observedValue !== undefined) {
      return null;
    }

    const behavior = input.missingDataBehavior;
    const impactByBehavior: Record<MissingDataBehavior, string> = {
      BlockEvaluation: 'Evaluation blocked',
      MarkInsufficientData: 'Result marked insufficient_data',
      ContinueWithReducedConfidence: 'Continue with reduced confidence',
      IgnoreForSuitability: 'Criterion excluded from suitability',
      WarningOnly: 'Warning only',
    };

    const requiredAction =
      behavior === 'BlockEvaluation' || behavior === 'MarkInsufficientData'
        ? 'Provide measured or verified value before concluding suitability'
        : behavior === 'ContinueWithReducedConfidence'
          ? 'Collect criterion value to improve confidence'
          : null;

    // Required vs Supporting messaging differs
    const levelNote =
      input.requirementLevel === 'Required'
        ? 'Required criterion is missing.'
        : input.requirementLevel === 'Important'
          ? 'Important criterion is missing.'
          : 'Supporting criterion is missing.';

    return {
      criterionCode: input.criterionCode,
      requirementLevel: input.requirementLevel,
      missingDataBehavior: behavior,
      impact: impactByBehavior[behavior],
      message: `${levelNote} Behavior=${behavior}. Value must not be assumed (e.g. zero/false).`,
      requiredAction,
    };
  }
}

export class CriticalBarrierEvaluationService {
  /**
   * Evaluate a single barrier rule against an observed (already normalized) value.
   * Does not orchestrate full crop analysis.
   */
  evaluateSingle(
    rule: CriticalBarrierRule,
    observedValue: unknown,
    opts?: { source?: string; dataQuality?: string },
  ): CriticalBarrierEvaluationResult {
    if (!rule.isActive) {
      return {
        isTriggered: false,
        ruleCode: rule.code,
        criterionCode: rule.criterionCode,
        observedValue,
        threshold: null,
        severity: rule.severity,
        reason: 'Rule is inactive',
        source: opts?.source ?? null,
        dataQuality: opts?.dataQuality ?? 'unknown',
      };
    }

    if (rule.verificationStatus === 'Draft' && observedValue == null) {
      // Draft without thresholds + missing value → not triggered as "unsuitable"
      return {
        isTriggered: false,
        ruleCode: rule.code,
        criterionCode: rule.criterionCode,
        observedValue,
        threshold: null,
        severity: rule.severity,
        reason: 'Draft rule with missing observed value — not treated as fail',
        source: opts?.source ?? null,
        dataQuality: opts?.dataQuality ?? 'missing',
      };
    }

    if (observedValue === null || observedValue === undefined) {
      return {
        isTriggered: false,
        ruleCode: rule.code,
        criterionCode: rule.criterionCode,
        observedValue,
        threshold: null,
        severity: rule.severity,
        reason: 'Observed value missing — use MissingDataEvaluationService, do not assume fail',
        source: opts?.source ?? null,
        dataQuality: 'missing',
      };
    }

    // Boolean expected (e.g. irrigation must be true)
    if (rule.evaluationType === 'Boolean' && rule.booleanExpected != null) {
      const triggered = Boolean(observedValue) !== rule.booleanExpected;
      return {
        isTriggered: triggered,
        ruleCode: rule.code,
        criterionCode: rule.criterionCode,
        observedValue,
        threshold: rule.booleanExpected,
        severity: rule.severity,
        reason: triggered
          ? rule.explanationTemplate
          : 'Boolean criterion satisfied',
        source: opts?.source ?? null,
        dataQuality: opts?.dataQuality ?? 'known',
      };
    }

    // Enum disallow list
    if (rule.disallowedValues && typeof observedValue === 'string') {
      const triggered = rule.disallowedValues.includes(observedValue);
      return {
        isTriggered: triggered,
        ruleCode: rule.code,
        criterionCode: rule.criterionCode,
        observedValue,
        threshold: rule.disallowedValues,
        severity: rule.severity,
        reason: triggered ? rule.explanationTemplate : 'Value allowed',
        source: opts?.source ?? null,
        dataQuality: opts?.dataQuality ?? 'known',
      };
    }

    // Thresholds — only when verified numbers exist
    if (typeof observedValue === 'number') {
      if (rule.criticalMaximum != null && observedValue > rule.criticalMaximum) {
        return {
          isTriggered: true,
          ruleCode: rule.code,
          criterionCode: rule.criterionCode,
          observedValue,
          threshold: rule.criticalMaximum,
          severity: rule.severity,
          reason: rule.explanationTemplate,
          source: opts?.source ?? null,
          dataQuality: opts?.dataQuality ?? 'known',
        };
      }
      if (rule.criticalMinimum != null && observedValue < rule.criticalMinimum) {
        return {
          isTriggered: true,
          ruleCode: rule.code,
          criterionCode: rule.criterionCode,
          observedValue,
          threshold: rule.criticalMinimum,
          severity: rule.severity,
          reason: rule.explanationTemplate,
          source: opts?.source ?? null,
          dataQuality: opts?.dataQuality ?? 'known',
        };
      }
    }

    return {
      isTriggered: false,
      ruleCode: rule.code,
      criterionCode: rule.criterionCode,
      observedValue,
      threshold: {
        min: rule.criticalMinimum,
        max: rule.criticalMaximum,
        booleanExpected: rule.booleanExpected,
      },
      severity: rule.severity,
      reason: 'No barrier triggered (or numeric thresholds not yet configured)',
      source: opts?.source ?? null,
      dataQuality: opts?.dataQuality ?? 'known',
    };
  }
}
