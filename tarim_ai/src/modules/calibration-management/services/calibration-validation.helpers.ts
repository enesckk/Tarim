import { randomUUID } from 'node:crypto';
import { tryParsePhysicalRequirements } from '../../crop-physical-compatibility/schemas/physical-requirements.schema.js';
import type {
  CalibrationManagementCalibration,
  ExpertActor,
  ExpertRole,
  FieldValidationStatus,
  OverallProfileValidationStatus,
  RequirementFieldKey,
  RequirementSource,
} from '../types/calibration-management.types.js';
import {
  FIELD_ROLE_AUTHORIZATION,
  PUBLICATION_ROLES,
  REQUIREMENT_FIELD_KEYS,
  REQUIREMENT_TO_FIELD_STATUS,
} from '../types/calibration-management.types.js';

export function createId(): string {
  return randomUUID();
}

export function emptyFieldValidationStatus(): Record<
  RequirementFieldKey,
  FieldValidationStatus
> {
  return {
    rootableSoilDepth: 'unvalidated',
    slope: 'unvalidated',
    ruggedness: 'unvalidated',
    surfaceStoniness: 'unvalidated',
    bedrockOutcrop: 'unvalidated',
    machineAccess: 'unvalidated',
    drainage: 'unvalidated',
  };
}

export function resolveOverallValidationStatus(
  fields: Record<RequirementFieldKey, FieldValidationStatus>,
  calibration: CalibrationManagementCalibration,
): OverallProfileValidationStatus {
  const values = REQUIREMENT_FIELD_KEYS.map((k) => fields[k]);
  if (values.some((v) => v === 'disputed')) return 'disputed';

  const fieldValidated = values.filter((v) => v === 'field_validated').length;
  const fieldObserved = values.filter((v) => v === 'field_observed').length;
  const expertReviewed = values.filter(
    (v) =>
      v === 'expert_reviewed' ||
      v === 'field_observed' ||
      v === 'field_validated' ||
      v === 'literature_supported',
  ).length;
  const literatureOrBetter = values.filter(
    (v) =>
      v === 'literature_supported' ||
      v === 'expert_reviewed' ||
      v === 'field_observed' ||
      v === 'field_validated',
  ).length;

  if (
    fieldValidated >=
    calibration.validationResolution.fieldValidatedMinimumFieldCount
  ) {
    return 'field_validated';
  }
  if (fieldObserved >= 2 && expertReviewed >= 3) {
    return 'field_supported';
  }
  if (
    expertReviewed >=
    calibration.validationResolution.expertReviewedMinimumFieldCount
  ) {
    return 'expert_reviewed';
  }
  if (
    literatureOrBetter >=
    calibration.validationResolution.partiallyValidatedMinimumFieldCount
  ) {
    return 'partially_validated';
  }
  return 'unvalidated';
}

export function reviewerAuthorizedForField(
  role: ExpertRole,
  field: RequirementFieldKey,
): boolean {
  return FIELD_ROLE_AUTHORIZATION[field].includes(role);
}

export function canPublish(role: ExpertRole): boolean {
  return PUBLICATION_ROLES.includes(role);
}

/** Administrator alone cannot elevate a scientific field to field_validated. */
export function canElevateFieldStatus(
  actor: ExpertActor,
  field: RequirementFieldKey,
  target: FieldValidationStatus,
): boolean {
  if (target === 'field_validated' && actor.role === 'administrator') {
    return false;
  }
  if (target === 'unvalidated' || target === 'rejected' || target === 'disputed') {
    return reviewerAuthorizedForField(actor.role, field) || actor.role === 'administrator';
  }
  return reviewerAuthorizedForField(actor.role, field);
}

export function validateRequirementsPayload(requirements: unknown): {
  ok: boolean;
  issues: string[];
} {
  const parsed = tryParsePhysicalRequirements(requirements);
  if (!parsed.ok) {
    return { ok: false, issues: parsed.issues };
  }
  const req = parsed.value;
  const issues: string[] = [];

  if (req.slope.maximumP90Percent < req.slope.acceptableMaximumMeanPercent) {
    issues.push('slope.maximumP90Percent must be >= acceptableMaximumMeanPercent');
  }
  if (req.drainageRequirement.preferred.includes('unknown' as never)) {
    issues.push('drainage preferred cannot include unknown');
  }
  for (const p of req.drainageRequirement.preferred) {
    if (req.drainageRequirement.notPreferred.includes(p)) {
      issues.push(`drainage ${p} cannot be both preferred and notPreferred`);
    }
  }
  if (req.machineAccessRequirement.minimum === ('unknown' as never)) {
    issues.push('machineAccess minimum cannot be unknown');
  }

  return { ok: issues.length === 0, issues };
}

export function defaultUnvalidatedSource(supports: string[]): RequirementSource {
  return {
    id: createId(),
    type: 'internal_initial_assumption',
    title: 'Initial unvalidated physical requirements bootstrap',
    notes: 'Copied from static crop knowledge base; not scientifically validated.',
    supports,
    verificationStatus: 'unverified',
  };
}

export function requirementSupportPaths(requirements: unknown): string[] {
  if (!requirements || typeof requirements !== 'object') return [];
  const keys = Object.keys(requirements as Record<string, unknown>).filter(
    (k) => !['source', 'validationStatus', 'notes'].includes(k),
  );
  return keys.flatMap((k) => {
    const field = REQUIREMENT_TO_FIELD_STATUS[k];
    return field ? [k] : [k];
  });
}

export interface CalibrationCheck {
  code: string;
  status: 'passed' | 'warning' | 'failed' | 'informational';
  observedValue?: string | number | boolean | null;
  expectedValue?: string | number | boolean | null;
  source?: string;
  message: string;
}
