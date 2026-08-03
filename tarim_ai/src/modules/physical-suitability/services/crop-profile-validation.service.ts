import type {
  ProfileValidationIssue,
  ProfileValidationResult,
} from '../types/physical-suitability.types.js';
import type { PhysicalSuitabilityRepository } from '../repositories/physical-suitability.repository.js';
import { CropDecisionMatrixService } from './domain-services.js';

export class CropProfileValidationService {
  constructor(
    private readonly repo: PhysicalSuitabilityRepository,
    private readonly matrix = new CropDecisionMatrixService(repo),
  ) {}

  async validate(cropId: string): Promise<ProfileValidationResult> {
    const issues: ProfileValidationIssue[] = [];
    const crop = await this.repo.getCropById(cropId);
    if (!crop) {
      return {
        cropId,
        valid: false,
        issues: [{ code: 'CROP_NOT_FOUND', severity: 'error', message: 'Crop not found' }],
      };
    }
    if (!crop.isActive) {
      issues.push({
        code: 'CROP_INACTIVE',
        severity: 'warning',
        message: 'Crop is inactive and must not be used in evaluation',
      });
    }

    const scenarios = (await this.repo.listScenarios(cropId)).filter((s) => s.isActive);
    if (scenarios.length === 0) {
      issues.push({
        code: 'NO_PRODUCTION_SCENARIO',
        severity: 'error',
        message: 'No active production scenario defined',
      });
    }

    for (const scenario of scenarios) {
      const { rules, barriers } = await this.matrix.getMatrix(cropId, scenario.id);
      if (rules.length === 0) {
        issues.push({
          code: 'EMPTY_DECISION_MATRIX',
          severity: 'error',
          message: `No criterion rules for scenario ${scenario.code}`,
          path: scenario.id,
        });
      }

      const required = rules.filter((r) => r.requirementLevel === 'Required');
      if (required.length === 0) {
        issues.push({
          code: 'REQUIRED_CRITERIA_MISSING',
          severity: 'error',
          message: `Scenario ${scenario.code} has no Required criteria`,
          path: scenario.id,
        });
      }

      if (barriers.length === 0) {
        issues.push({
          code: 'CRITICAL_BARRIER_MISSING',
          severity: 'error',
          message: `Scenario ${scenario.code} has no critical barrier rules`,
          path: scenario.id,
        });
      }

      for (const rule of rules) {
        if (!rule.missingDataBehavior) {
          issues.push({
            code: 'MISSING_DATA_BEHAVIOR_UNDEFINED',
            severity: 'error',
            message: `Rule ${rule.criterionCode} missing MissingDataBehavior`,
            path: rule.id,
          });
        }
        if (!rule.sourceReferenceId) {
          issues.push({
            code: 'SOURCE_REFERENCE_MISSING',
            severity: 'error',
            message: `Rule ${rule.criterionCode} has no source reference — cannot publish`,
            path: rule.id,
          });
        }
        if (rule.verificationStatus === 'Approved') {
          issues.push({
            code: 'PREMATURE_APPROVAL',
            severity: 'error',
            message: `Rule ${rule.criterionCode} is Approved without expert workflow in Phase 1`,
            path: rule.id,
          });
        }
        if (rule.verificationStatus === 'Draft') {
          issues.push({
            code: 'DRAFT_RULE',
            severity: 'warning',
            message: `Rule ${rule.criterionCode} is Draft — not usable as Approved`,
            path: rule.id,
          });
        }

        const criterion = await this.repo.getCriterionByCode(rule.criterionCode);
        if (!criterion) {
          issues.push({
            code: 'CRITERION_UNDEFINED',
            severity: 'error',
            message: `Criterion ${rule.criterionCode} not in catalog`,
            path: rule.id,
          });
        } else if (
          (rule.evaluationType === 'Range' || rule.evaluationType === 'Threshold') &&
          !criterion.unit &&
          criterion.dataType === 'Decimal'
        ) {
          issues.push({
            code: 'UNIT_UNDEFINED',
            severity: 'warning',
            message: `Criterion ${rule.criterionCode} has no unit`,
            path: rule.id,
          });
        }

        if (rule.optimalRange && rule.acceptableRange) {
          const o = rule.optimalRange;
          const a = rule.acceptableRange;
          if (
            o.min != null &&
            a.min != null &&
            o.max != null &&
            a.max != null &&
            (o.min < a.min || o.max > a.max)
          ) {
            issues.push({
              code: 'OPTIMAL_OUTSIDE_ACCEPTABLE',
              severity: 'error',
              message: `Optimal range outside acceptable for ${rule.criterionCode}`,
              path: rule.id,
            });
          }
        }

        if (
          rule.criticalMinimum != null &&
          rule.criticalMaximum != null &&
          rule.criticalMinimum > rule.criticalMaximum
        ) {
          issues.push({
            code: 'CRITICAL_BOUNDS_INVALID',
            severity: 'error',
            message: `CriticalMinimum > CriticalMaximum for ${rule.criterionCode}`,
            path: rule.id,
          });
        }

        // Phase 1: numeric thresholds expected to be null — warn as incomplete, not invent
        if (
          (rule.evaluationType === 'Range' || rule.evaluationType === 'Threshold') &&
          rule.optimalRange == null &&
          rule.acceptableRange == null &&
          rule.criticalMinimum == null &&
          rule.criticalMaximum == null
        ) {
          issues.push({
            code: 'THRESHOLDS_PENDING',
            severity: 'warning',
            message: `Numeric thresholds for ${rule.criterionCode} not yet verified (left null)`,
            path: rule.id,
          });
        }
      }

      const conflicts = await this.matrix.detectConflicts(cropId, scenario.id);
      for (const c of conflicts) {
        issues.push({
          code: 'CONFLICTING_ACTIVE_RULES',
          severity: 'error',
          message: `Conflicting active rules: ${c}`,
          path: scenario.id,
        });
      }
    }

    const valid = !issues.some((i) => i.severity === 'error');
    return { cropId, valid, issues };
  }
}
