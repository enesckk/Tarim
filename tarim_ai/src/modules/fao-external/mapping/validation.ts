import type { GaezCropMapping, ReviewStatus } from '../types/models.js';

const ALLOWED: Record<ReviewStatus, ReviewStatus[]> = {
  draft: ['reviewed', 'rejected'],
  reviewed: ['approved', 'rejected', 'draft'],
  approved: ['rejected', 'reviewed'],
  rejected: ['draft'],
};

export type MappingValidationIssue = {
  code: string;
  message: string;
};

export function validateCropMapping(mapping: GaezCropMapping): MappingValidationIssue[] {
  const issues: MappingValidationIssue[] = [];
  if (!mapping.internalCropCode?.trim()) {
    issues.push({ code: 'missing_internal_crop_code', message: 'internalCropCode required' });
  }
  if (!mapping.scientificName?.trim()) {
    issues.push({ code: 'missing_scientific_name', message: 'scientificName required' });
  }
  if (!mapping.ecocropId && !mapping.gaezCropCode) {
    issues.push({
      code: 'no_external_codes',
      message: 'At least one of ecocropId or gaezCropCode should be present (or explicitly unavailable)',
    });
  }
  if (mapping.gaezCropCode && !mapping.gaezVersion) {
    issues.push({
      code: 'gaez_version_required_with_code',
      message: 'gaezVersion required when gaezCropCode is set (v4/v5 separation)',
    });
  }
  if (mapping.reviewStatus === 'approved' && mapping.confidence == null) {
    issues.push({
      code: 'approved_requires_confidence',
      message: 'Approved mappings must set confidence',
    });
  }
  return issues;
}

export function assertMappingTransition(from: ReviewStatus, to: ReviewStatus): void {
  if (!ALLOWED[from].includes(to)) {
    throw new Error(`Invalid mapping status transition: ${from} → ${to}`);
  }
}

export function reviewCropMapping(
  mapping: GaezCropMapping,
  to: ReviewStatus,
  reviewer: string,
  confidence?: GaezCropMapping['confidence'],
): GaezCropMapping {
  assertMappingTransition(mapping.reviewStatus, to);
  const next: GaezCropMapping = {
    ...mapping,
    reviewStatus: to,
    reviewedBy: reviewer,
    reviewedAt: new Date().toISOString(),
    confidence: confidence ?? mapping.confidence,
  };
  if (to === 'approved') {
    const issues = validateCropMapping(next);
    const blocking = issues.filter((i) => i.code !== 'no_external_codes');
    // Allow approve with no GAEZ code only if notes declare official absence
    if (
      !next.gaezCropCode &&
      !next.notes.some((n) => n.includes('gaez_v4_crop_not_found'))
    ) {
      throw new Error('Cannot approve mapping without gaezCropCode unless official absence noted');
    }
    if (blocking.length) {
      throw new Error(`Mapping validation failed: ${blocking.map((b) => b.code).join(',')}`);
    }
    if (!next.confidence) {
      throw new Error('Approved mappings require confidence');
    }
  }
  return next;
}

/** Production sampling must use approved mappings only. */
export function assertMappingApprovedForSampling(mapping: GaezCropMapping): void {
  if (mapping.reviewStatus !== 'approved') {
    throw new Error(
      `Mapping ${mapping.internalCropCode} is ${mapping.reviewStatus}; approved required for sampling`,
    );
  }
  if (!mapping.gaezCropCode) {
    throw new Error(`Mapping ${mapping.internalCropCode} has no GAEZ crop code`);
  }
}
