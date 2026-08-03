import type { PhysicalSuitabilityFacade } from '../../physical-suitability/services/physical-suitability.facade.js';
import type {
  CriticalBarrierRule,
  ProductionScenario,
} from '../../physical-suitability/types/physical-suitability.types.js';
import type {
  CriticalBarrierOutcome,
  IrrigationAvailabilityInput,
  ResolvedInputValue,
} from '../types/seasonal-crop-analysis.types.js';

/**
 * A catalog barrier rule is only allowed to block a crop when its content has
 * gone through verification. Every rule seeded in Phase 1 is `Draft` with null
 * thresholds by design (see phase1-seed.ts) — Draft rules must NEVER block,
 * regardless of evaluation type. Rules promoted to `ExpertReviewed` (see
 * seasonal-crop-scientific-profile-v1.seed.ts) or `Approved` carry
 * scientifically-sourced thresholds and may block.
 */
function isEligibleCatalogBarrier(rule: CriticalBarrierRule): boolean {
  return (
    rule.isActive &&
    (rule.verificationStatus === 'Approved' || rule.verificationStatus === 'ExpertReviewed')
  );
}

export interface BarrierEvaluationResult {
  barriers: CriticalBarrierOutcome[];
  hasBlockingBarrier: boolean;
  blockingBarrierCodes: string[];
  limitations: string[];
}

export class SeasonalCriticalBarrierService {
  constructor(private readonly facade: PhysicalSuitabilityFacade) {}

  async evaluate(input: {
    cropId: string;
    scenario: ProductionScenario;
    resolvedByCriterion: Map<string, ResolvedInputValue>;
    irrigationAvailability: IrrigationAvailabilityInput;
    hasIrrigationWaterReport: boolean;
  }): Promise<BarrierEvaluationResult> {
    const { rules: cropRules, barriers: barrierRules } = await this.facade.matrix.getMatrix(
      input.cropId,
      input.scenario.id,
    );
    void cropRules;

    const outcomes: CriticalBarrierOutcome[] = [];
    const limitations: string[] = [];

    for (const rule of barrierRules) {
      if (!isEligibleCatalogBarrier(rule)) continue;
      const resolvedInput = input.resolvedByCriterion.get(rule.criterionCode);
      const evaluation = this.facade.evaluateBarrier(rule, resolvedInput?.value ?? null);
      const [criterion, sourceReference] = await Promise.all([
        this.facade.getRepository().getCriterionByCode(rule.criterionCode),
        rule.sourceReferenceId
          ? this.facade.getRepository().getSourceReference(rule.sourceReferenceId)
          : Promise.resolve(null),
      ]);
      outcomes.push({
        code: rule.code,
        criterionCode: rule.criterionCode,
        isTriggered: evaluation.isTriggered,
        severity: evaluation.severity,
        reason: evaluation.reason,
        observedValue: evaluation.observedValue,
        source: 'catalog_rule',
        threshold: evaluation.threshold,
        unit: criterion?.unit ?? null,
        sourceReference: sourceReference?.title ?? null,
      });
    }

    // Operational irrigation barrier — derived from the scenario's declared
    // production type and the applicant's own irrigation declaration. Not a
    // stored catalog rule, and no threshold is invented.
    const isIrrigatedScenario = input.scenario.productionType === 'Irrigated';
    if (isIrrigatedScenario) {
      if (input.irrigationAvailability === 'unavailable') {
        outcomes.push({
          code: 'irrigation_unavailable_for_irrigated_scenario',
          criterionCode: 'water.irrigation_available',
          isTriggered: true,
          severity: 'Blocking',
          reason:
            'Bu senaryo sulamalı üretim gerektirir; başvuru sahibi sulama suyunun mevcut olmadığını beyan etti.',
          observedValue: false,
          source: 'operational_rule',
        });
      } else {
        outcomes.push({
          code: 'irrigation_available_for_irrigated_scenario',
          criterionCode: 'water.irrigation_available',
          isTriggered: false,
          severity: 'Blocking',
          reason:
            input.irrigationAvailability === 'available_and_sufficient'
              ? 'Başvuru sahibi sulama suyu miktarının yeterli olduğunu beyan etti; su kalitesi ayrı bir konudur.'
              : 'Başvuru sahibi sınırlı sulama suyu erişimi olduğunu beyan etti.',
          observedValue: true,
          source: 'operational_rule',
        });
        if (!input.hasIrrigationWaterReport) {
          limitations.push('irrigation_water_quality_unknown');
        }
      }
    }

    const blocking = outcomes.filter((o) => o.isTriggered && o.severity === 'Blocking');
    return {
      barriers: outcomes,
      hasBlockingBarrier: blocking.length > 0,
      blockingBarrierCodes: blocking.map((b) => b.code),
      limitations,
    };
  }
}
